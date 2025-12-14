import React, { useState, useEffect } from 'react';
import { AppState, DirectorPlan, FileWithPreview, GenerationResult } from './types';
import ImageUpload from './components/ImageUpload';
import PlanViewer from './components/PlanViewer';
import { createDirectorPlan, executeGeneration, initializeGenAI, getBestAvailableImageModel } from './services/geminiService';
import { Sparkles, BrainCircuit, RefreshCw, Key, Download, Aperture, FolderUp, Copy, Check, Zap, Crown } from 'lucide-react';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(AppState.IDLE);
  const [userRequest, setUserRequest] = useState("");
  const [faceImages, setFaceImages] = useState<FileWithPreview[]>([]);
  const [bodyImages, setBodyImages] = useState<FileWithPreview[]>([]);
  const [styleImages, setStyleImages] = useState<FileWithPreview[]>([]);
  const [inputImage, setInputImage] = useState<FileWithPreview[]>([]); 
  const [driveLink, setDriveLink] = useState(""); 
  
  const [currentPlan, setCurrentPlan] = useState<DirectorPlan | null>(null);
  const [finalResult, setFinalResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultCopied, setResultCopied] = useState(false);
  const [detectedTier, setDetectedTier] = useState<"PRO" | "FLASH" | "CHECKING">("CHECKING");

  useEffect(() => {
    initializeGenAI();
    detectAccountTier();
  }, []);

  const detectAccountTier = async () => {
      // Proactively check if the user has access to the Pro model
      try {
        const bestModel = await getBestAvailableImageModel("gemini-3-pro-image-preview");
        if (bestModel.includes("pro") || bestModel.includes("veo")) {
            setDetectedTier("PRO");
        } else {
            setDetectedTier("FLASH");
        }
      } catch (e) {
        setDetectedTier("FLASH");
      }
  };

  const handleApiKeySelection = async () => {
      if (window.aistudio && window.aistudio.openSelectKey) {
          try {
              await window.aistudio.openSelectKey();
              initializeGenAI();
              detectAccountTier(); // Re-detect after key change
          } catch (e) {
              console.error("Key selection failed", e);
          }
      } else {
          alert("API Key selection not available in this environment.");
      }
  };

  const handleCopyPrompt = () => {
    if (currentPlan) {
        navigator.clipboard.writeText(currentPlan.final_prompt_text);
        setResultCopied(true);
        setTimeout(() => setResultCopied(false), 2000);
    }
  };

  const generatePlan = async () => {
    if (!userRequest.trim()) return;
    
    if (!process.env.API_KEY && window.aistudio) {
        await handleApiKeySelection();
    }

    setState(AppState.PLANNING);
    setError(null);

    try {
      const plan = await createDirectorPlan(
        userRequest,
        faceImages,
        bodyImages,
        styleImages,
        driveLink,
        inputImage.length > 0 ? inputImage[0] : null
      );
      setCurrentPlan(plan);
      setState(AppState.PLAN_READY);
    } catch (err: any) {
      setError(err.message || "Failed to generate plan.");
      setState(AppState.IDLE);
    }
  };

  const executePlan = async () => {
    if (!currentPlan) return;
    setState(AppState.GENERATING);
    setError(null);
    try {
      if (!process.env.API_KEY && window.aistudio) {
          await handleApiKeySelection();
      }

      const result = await executeGeneration(
        currentPlan,
        faceImages,
        bodyImages,
        styleImages,
        inputImage.length > 0 ? inputImage[0] : null
      );
      setFinalResult(result);
      setState(AppState.COMPLETE);
    } catch (err: any) {
       setError(err.message || "Failed to generate image.");
       setState(AppState.PLAN_READY);
    }
  };

  const reset = () => {
    setState(AppState.IDLE);
    setFinalResult(null);
    setCurrentPlan(null);
  };

  return (
    <div className="min-h-screen text-gray-100 selection:bg-purple-500/40 selection:text-white">
      {/* Glass Header */}
      <header className="sticky top-0 z-50 transition-all duration-300 border-b border-white/5 bg-black/10 backdrop-blur-xl supports-[backdrop-filter]:bg-black/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 rounded-xl shadow-lg shadow-purple-500/20">
                <BrainCircuit size={22} className="text-white" />
            </div>
            <div>
                <h1 className="text-xl font-bold tracking-tight text-white">
                Visual Director
                </h1>
                <p className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">AI Art Direction</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Tier Indicator */}
            <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold tracking-wide ${
                detectedTier === "PRO" 
                ? "bg-purple-500/10 border-purple-500/30 text-purple-200" 
                : "bg-blue-500/10 border-blue-500/30 text-blue-200"
            }`}>
                 {detectedTier === "PRO" ? <Crown size={12} className="text-yellow-400" /> : <Zap size={12} />}
                 <span>{detectedTier === "CHECKING" ? "Checking..." : detectedTier === "PRO" ? "PRO ACCESS" : "FLASH TIER"}</span>
            </div>

            {window.aistudio && (
                <button 
                    onClick={handleApiKeySelection}
                    className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-xs font-medium flex items-center gap-2 text-white/70 hover:text-white"
                >
                    <Key size={14} />
                    <span>API Key</span>
                </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Error Banner */}
        {error && (
            <div className="mb-8 bg-red-500/10 backdrop-blur-md border border-red-500/20 text-red-200 px-6 py-4 rounded-2xl flex justify-between items-center shadow-xl">
                <span className="font-medium">{error}</span>
                <button onClick={() => setError(null)} className="p-2 hover:bg-red-500/20 rounded-full transition-colors"><Sparkles size={18} /></button>
            </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            
            {/* LEFT COLUMN: Inputs - Glass Panel */}
            <div className={`lg:col-span-5 space-y-8 transition-all duration-500 ${state !== AppState.IDLE ? 'opacity-40 blur-[2px] pointer-events-none' : ''}`}>
                
                {/* 1. Request Input */}
                <div className="space-y-4">
                    <label className="text-xs font-bold text-white/50 uppercase tracking-widest pl-1 flex items-center gap-2">
                        <Sparkles size={12} className="text-purple-400"/> The Vision
                    </label>
                    <div className="relative group">
                         <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-3xl opacity-20 group-hover:opacity-40 transition duration-500 blur"></div>
                        <textarea 
                            className="relative w-full h-40 bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6 text-lg text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20 resize-none transition-all shadow-inner leading-relaxed"
                            placeholder="Describe your vision...&#10;Ex: 'Swap outfit for a black tuxedo, standing in a modern office.'"
                            value={userRequest}
                            onChange={(e) => setUserRequest(e.target.value)}
                        />
                    </div>
                </div>

                {/* 2. Identity References - Glass Card */}
                <div className="bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-xl">
                    <div className="flex items-center gap-3 mb-6">
                         <div className="p-1.5 bg-white/10 rounded-lg">
                            <Aperture size={16} className="text-blue-300"/>
                         </div>
                        <h3 className="text-lg font-semibold text-white">Identity References</h3>
                    </div>
                    
                    <ImageUpload 
                        label="Face (Close-ups)" 
                        description="Critical for facial identity."
                        files={faceImages} 
                        onFilesChange={setFaceImages} 
                    />
                    <div className="h-px bg-white/5 my-6"></div>
                    <ImageUpload 
                        label="Body (Full shot)" 
                        description="Critical for proportions."
                        files={bodyImages} 
                        onFilesChange={setBodyImages} 
                    />

                    {/* Drive / LoRA Link Input */}
                    <div className="mt-6 pt-6 border-t border-white/5">
                        <label className="text-xs font-bold text-white/50 uppercase tracking-widest pl-1 mb-2 block flex items-center gap-2">
                            <FolderUp size={14} className="text-green-400" />
                            Train / LoRA Dataset
                        </label>
                        <div className="relative group">
                            <input
                                type="text"
                                value={driveLink}
                                onChange={(e) => setDriveLink(e.target.value)}
                                placeholder="Paste Google Drive Folder Link..."
                                className="w-full bg-black/20 backdrop-blur-xl border border-white/10 rounded-xl py-3 px-4 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-green-500/50 transition-all"
                            />
                        </div>
                        <p className="text-[10px] text-white/30 mt-2 pl-1 leading-relaxed">
                            Provide a link to a folder with high-res images to simulate LoRA training for better identity consistency.
                        </p>
                    </div>
                </div>

                 {/* 3. Optional Context - Glass Card */}
                 <div className="bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-xl">
                    <h3 className="text-lg font-semibold text-white mb-6">Context (Optional)</h3>
                     <ImageUpload 
                        label="Input Image (To Edit)" 
                        description="If empty, a new image is generated."
                        files={inputImage} 
                        onFilesChange={setInputImage}
                        maxFiles={1}
                    />
                    <div className="h-px bg-white/5 my-6"></div>
                    <ImageUpload 
                        label="Style References" 
                        description="Vibe, lighting, clothing styles."
                        files={styleImages} 
                        onFilesChange={setStyleImages} 
                        maxFiles={4}
                    />
                </div>
            
                <button 
                    onClick={generatePlan}
                    disabled={state !== AppState.IDLE || !userRequest}
                    className="w-full py-4 rounded-2xl font-semibold text-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl relative overflow-hidden group"
                    style={{
                        background: 'linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%)',
                        color: '#0f172a'
                    }}
                >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                        {state === AppState.PLANNING ? "Designing Plan..." : "Create Director Plan"}
                        {!state.includes('PLANNING') && <BrainCircuit size={18} className="opacity-60" />}
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                </button>
            </div>

            {/* RIGHT COLUMN: Output / Interaction - Sticky Panel */}
            <div className="lg:col-span-7 sticky top-24 h-fit min-h-[500px]">
                
                {state === AppState.IDLE && (
                    <div className="h-[600px] flex flex-col items-center justify-center text-white/30 border border-dashed border-white/10 rounded-3xl bg-white/[0.02] backdrop-blur-sm">
                        <div className="p-8 bg-white/5 rounded-full mb-6 animate-pulse">
                            <Sparkles size={48} className="opacity-50" />
                        </div>
                        <p className="text-xl font-light tracking-wide">Configure your vision to begin</p>
                    </div>
                )}

                {state === AppState.PLANNING && (
                     <div className="h-[600px] flex flex-col items-center justify-center text-white/50 bg-white/[0.02] backdrop-blur-md rounded-3xl border border-white/5">
                        <div className="relative w-24 h-24 mb-8">
                             <div className="absolute inset-0 border-4 border-t-purple-500 border-r-transparent border-b-blue-500 border-l-transparent rounded-full animate-spin"></div>
                             <div className="absolute inset-2 border-4 border-t-transparent border-r-blue-500 border-b-transparent border-l-purple-500 rounded-full animate-spin-reverse opacity-50"></div>
                        </div>
                        <p className="text-lg font-light tracking-wide animate-pulse">Analyzing references...</p>
                    </div>
                )}

                {(state === AppState.PLAN_READY || state === AppState.GENERATING) && currentPlan && (
                    <PlanViewer 
                        plan={currentPlan} 
                        onConfirm={executePlan} 
                        onCancel={() => setState(AppState.IDLE)} 
                        loading={state === AppState.GENERATING}
                    />
                )}

                {state === AppState.COMPLETE && finalResult && (
                    <div className="animate-fade-in bg-white/5 backdrop-blur-2xl rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                            <h2 className="font-bold text-white flex items-center gap-2">
                                <Sparkles className="text-yellow-300" size={18} />
                                Final Result
                            </h2>
                            <div className="flex gap-2">
                                <button onClick={reset} className="p-2.5 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white">
                                    <RefreshCw size={18} />
                                </button>
                                {finalResult.imageUrl && (
                                     <a href={finalResult.imageUrl} download="director-output.png" className="p-2.5 hover:bg-blue-500/20 text-blue-300 hover:text-blue-200 rounded-full transition-colors">
                                        <Download size={18} />
                                     </a>
                                )}
                            </div>
                        </div>
                        
                        {/* Image Display */}
                        <div className="p-8 flex items-center justify-center bg-black/40 min-h-[400px]">
                            {finalResult.imageUrl ? (
                                <img 
                                    src={finalResult.imageUrl} 
                                    alt="Generated" 
                                    className="max-w-full max-h-[60vh] rounded-lg shadow-2xl ring-1 ring-white/10"
                                />
                            ) : (
                                <div className="p-12 text-center text-white/50 border border-dashed border-white/10 rounded-2xl max-w-md">
                                    <p className="text-lg font-light">{finalResult.text}</p>
                                </div>
                            )}
                        </div>

                        {/* Prompt Display for Copying */}
                         {currentPlan && (
                            <div className="p-6 border-t border-white/5 bg-white/[0.02]">
                                <div className="flex justify-between items-end mb-3">
                                    <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest pl-1">Generated Prompt</h3>
                                    <button 
                                        onClick={handleCopyPrompt}
                                        className="flex items-center gap-1.5 text-[10px] font-medium bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg text-white/60 hover:text-white transition-all border border-white/5"
                                    >
                                        {resultCopied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                                        {resultCopied ? "COPIED" : "COPY PROMPT"}
                                    </button>
                                </div>
                                <div className="bg-black/20 p-4 rounded-xl border border-white/5 font-mono text-xs text-white/60 leading-relaxed overflow-x-auto whitespace-pre-wrap">
                                    {currentPlan.final_prompt_text}
                                </div>
                            </div>
                        )}
                    </div>
                )}

            </div>
        </div>
      </main>
    </div>
  );
};

export default App;