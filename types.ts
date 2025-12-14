export interface FileWithPreview {
  file: File;
  preview: string;
  base64: string;
  mimeType: string;
}

export interface DirectorPlan {
  mode: "EDIT" | "GENERATE" | "BLOCKED";
  model_suggestion: string;
  subject_analysis?: string; // Analysis of the user's physical appearance extracted from photos
  image_config: {
    aspectRatio?: string;
    imageSize?: string;
  };
  contents_plan: {
    order: string[];
    notes: string;
  };
  final_prompt_text: string;
  negative_instructions: string[];
  masking_recommendation: {
    needs_mask: boolean;
    mask_targets: string[];
    mask_guidance: string;
  };
  quality_checks: string[];
  block_reason?: string; // If blocked
}

export interface GenerationResult {
  imageUrl?: string;
  text?: string;
}

export enum AppState {
  IDLE = 'IDLE',
  PLANNING = 'PLANNING',
  PLAN_READY = 'PLAN_READY',
  GENERATING = 'GENERATING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}