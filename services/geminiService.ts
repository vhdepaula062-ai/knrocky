import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { DIRECTOR_SYSTEM_INSTRUCTION } from "../constants";
import { DirectorPlan, FileWithPreview, GenerationResult } from "../types";

let genAI: GoogleGenAI | null = null;
// Cache for available models to avoid repeated API calls
let availableModelsCache: Set<string> | null = null;

export const initializeGenAI = () => {
  if (process.env.API_KEY) {
    genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
    // Clear cache on re-init
    availableModelsCache = null;
  }
};

// Ensures we have a fresh instance
const getAI = () => {
    if (process.env.API_KEY) {
         return new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    if (!genAI) {
        throw new Error("API Key not found. Please select an API Key.");
    }
    return genAI;
};

// --- Model Capability Resolution ---

/**
 * Checks which models are actually available to this API Key.
 * Falls back to a default if the listing fails.
 */
export const getBestAvailableImageModel = async (preferredModel: string): Promise<string> => {
  const ai = getAI();
  
  // If we already checked, use cache
  if (availableModelsCache) {
    return resolveFromCache(preferredModel, availableModelsCache);
  }

  try {
    console.log("Detecting account capabilities...");
    const response = await ai.models.list();
    
    if (response.models) {
      availableModelsCache = new Set(
        response.models.map(m => m.name?.replace('models/', '') || '')
      );
      return resolveFromCache(preferredModel, availableModelsCache);
    }
  } catch (e) {
    console.warn("Failed to list models (likely API restriction). Using fallback logic.", e);
  }

  // If list fails, assume the user has access to at least Flash, 
  // but stick to preferred and let the specific try/catch in execute handle it.
  return preferredModel;
};

const resolveFromCache = (preferred: string, available: Set<string>): string => {
  // 1. If we have the preferred model, use it.
  if (available.has(preferred)) {
    console.log(`Capability Match: Using ${preferred}`);
    return preferred;
  }

  // 2. If preferred is a PRO/Preview image model, but we don't have it,
  // try to find the best Flash Image model.
  if (preferred.includes('pro') || preferred.includes('preview')) {
    if (available.has('gemini-2.5-flash-image')) {
      console.log(`Capability Adapt: Downgrading to gemini-2.5-flash-image`);
      return 'gemini-2.5-flash-image';
    }
  }

  // 3. Last resort: stick to preferred and hope for the best (or let error handler catch it)
  return preferred;
};

// --- End Capability Resolution ---

// Configuration for MAXIMUM artistic freedom
const permissiveSafetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
];

export const createDirectorPlan = async (
  userRequest: string,
  faceImages: FileWithPreview[],
  bodyImages: FileWithPreview[],
  styleImages: FileWithPreview[],
  driveLink: string,
  inputImage: FileWithPreview | null
): Promise<DirectorPlan> => {
  const ai = getAI();
  
  const parts: any[] = [];
  
  parts.push({ text: `USER REQUEST: ${userRequest}` });

  if (driveLink && driveLink.trim() !== "") {
    parts.push({ text: `DRIVE_LORA_DATASET: ${driveLink} (Use this link as high-priority context for identity training/consistency)` });
  }

  parts.push({ 
    text: `OUTPUT_CONSTRAINTS: ${JSON.stringify({
      aspect_ratio: "1:1",
      resolution: "1K",
      photorealism_level: "High",
      language: "pt-BR"
    })}` 
  });

  if (inputImage) {
    parts.push({ text: "\n[INPUT_IMAGE provided for editing]" });
    parts.push({ inlineData: { mimeType: inputImage.mimeType, data: inputImage.base64 } });
  }

  if (faceImages.length > 0) {
    parts.push({ text: "\n[REF_IMAGES_FACE provided - ANALYZE THESE FOR IDENTITY]" });
    faceImages.forEach(img => {
      parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
    });
  }

  if (bodyImages.length > 0) {
    parts.push({ text: "\n[REF_IMAGES_BODY provided - ANALYZE THESE FOR BODY TYPE]" });
    bodyImages.forEach(img => {
      parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
    });
  }

  if (styleImages.length > 0) {
    parts.push({ text: "\n[REF_IMAGES_STYLE provided]" });
    styleImages.forEach(img => {
      parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
    });
  }

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      mode: { type: Type.STRING, enum: ["EDIT", "GENERATE", "BLOCKED"] },
      model_suggestion: { type: Type.STRING },
      subject_analysis: { type: Type.STRING, description: "Detailed physical description of the person in the photos." },
      image_config: {
        type: Type.OBJECT,
        properties: {
          aspectRatio: { type: Type.STRING },
          imageSize: { type: Type.STRING },
        }
      },
      contents_plan: {
        type: Type.OBJECT,
        properties: {
          order: { type: Type.ARRAY, items: { type: Type.STRING } },
          notes: { type: Type.STRING }
        }
      },
      final_prompt_text: { type: Type.STRING },
      negative_instructions: { type: Type.ARRAY, items: { type: Type.STRING } },
      masking_recommendation: {
        type: Type.OBJECT,
        properties: {
          needs_mask: { type: Type.BOOLEAN },
          mask_targets: { type: Type.ARRAY, items: { type: Type.STRING } },
          mask_guidance: { type: Type.STRING }
        }
      },
      quality_checks: { type: Type.ARRAY, items: { type: Type.STRING } },
      block_reason: { type: Type.STRING }
    },
    required: ["mode", "final_prompt_text"]
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts },
      config: {
        systemInstruction: DIRECTOR_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.6,
        safetySettings: permissiveSafetySettings,
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Director AI");
    
    const parsed = JSON.parse(text);
    if (!parsed.image_config) {
        parsed.image_config = { aspectRatio: "1:1", imageSize: "1K" };
    }
    if (!parsed.negative_instructions) parsed.negative_instructions = [];
    if (!parsed.quality_checks) parsed.quality_checks = [];

    return parsed as DirectorPlan;
  } catch (error) {
    console.error("Director Plan Error:", error);
    throw error;
  }
};

const extractImageFromResponse = (response: any): GenerationResult => {
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return { imageUrl: `data:image/png;base64,${part.inlineData.data}` };
      }
    }
    return { text: response.text || "No image generated." };
};

export const executeGeneration = async (
  plan: DirectorPlan,
  faceImages: FileWithPreview[],
  bodyImages: FileWithPreview[],
  styleImages: FileWithPreview[],
  inputImage: FileWithPreview | null
): Promise<GenerationResult> => {
  const ai = getAI();
  
  // 1. Resolve Best Model based on Account Capabilities
  // This prevents the user from hitting a 403 or 404 if they don't have the paid model.
  const idealModel = plan.model_suggestion || "gemini-3-pro-image-preview";
  const actualModel = await getBestAvailableImageModel(idealModel);

  const parts: any[] = [];
  
  parts.push({ text: plan.final_prompt_text });

  if (plan.negative_instructions && plan.negative_instructions.length > 0) {
    parts.push({ text: `\n\nNEGATIVE INSTRUCTIONS (Avoid these): ${plan.negative_instructions.join(", ")}` });
  }

  if (plan.mode === "EDIT" && inputImage) {
    parts.push({ inlineData: { mimeType: inputImage.mimeType, data: inputImage.base64 } });
  }

  faceImages.forEach(img => {
    parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
  });
  
  bodyImages.forEach(img => {
     parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
  });

  styleImages.forEach(img => {
     parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
  });

  const generateWithModel = async (model: string) => {
      const config: any = {
        safetySettings: permissiveSafetySettings,
        imageConfig: {
            aspectRatio: plan.image_config?.aspectRatio || "1:1",
        }
      };
      
      // Only Pro supports imageSize
      if (model.includes("pro") || model.includes("veo")) {
          config.imageConfig.imageSize = plan.image_config?.imageSize || "1K";
      }

      console.log(`Executing generation with model: ${model}`);

      return await ai.models.generateContent({
          model: model,
          contents: { parts },
          config: config
      });
  };

  try {
    const response = await generateWithModel(actualModel);
    return extractImageFromResponse(response);
  } catch (error: any) {
    // If the resolved model still fails (e.g. rate limit or unexpected 403),
    // and we haven't already tried the flash model, try fallback.
    const isErrorRecoverable = error.status === 403 || error.status === 404 || error.status === 429;
    
    if (isErrorRecoverable && actualModel !== "gemini-2.5-flash-image") {
        console.warn(`Model ${actualModel} failed. Attempting final fallback to gemini-2.5-flash-image.`);
        try {
            const response = await generateWithModel("gemini-2.5-flash-image");
            return extractImageFromResponse(response);
        } catch (fallbackError: any) {
             throw new Error(`Generation failed with fallback. Details: ${fallbackError.message}`);
        }
    }
    
    console.error("Generation Error:", error);
    throw error;
  }
};