import React, { useState } from 'react';
import { DirectorPlan } from '../types';
import { CheckCircle2, AlertTriangle, Wand2, ShieldAlert, ScanLine, Copy, Check, Fingerprint } from 'lucide-react';

interface PlanViewerProps {
  plan: DirectorPlan;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

const PlanViewer: React.FC<PlanViewerProps> = ({ plan, onConfirm, onCancel, loading }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(plan.final_prompt_text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (plan.mode === "BLOCKED") {
    return (
      <div className="p-8 bg-red-500/10 backdrop-blur-xl border border-red-500/20 rounded-3xl shadow-2xl">
        <div className="flex items-center gap-4 text-red-200 mb-6">
          <div className="p-3 bg-red-500/20 rounded-full">
            <ShieldAlert size={32} />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Request Blocked</h2>
        </div>
        <p className="text-white/80 text-lg mb-8 leading-relaxed">{plan.block_reason || "Content policy violation detected."}</p>
        <button onClick={onCancel} className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white font-medium transition-all">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="relative bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-fade-in flex flex-col h-full">
      {/* Glossy header highlight */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

      <div className="p-8 border-b border-white/5 bg-white/[0.02]">
        <div className="flex justify-between items-start">
            <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-tr from-purple-500 to-blue-500 rounded-xl shadow-lg shadow-purple-500/20">
                        <Wand2 className="text-white" size={20}/>
                    </div>
                    Director's Plan
                </h2>
                <p className="text-white/40 text-sm mt-2 ml-1">Review the generation strategy before execution.</p>
            </div>
            <div className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wide border ${plan.mode === 'EDIT' ? 'bg-blue-500/10 border-blue-500/20 text-blue-200' : 'bg-green-500/10 border-green-500/20 text-green-200'}`}>
                {plan.mode} MODE
            </div>
        </div>
      </div>

      <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar flex-grow">
        
        {/* Subject Analysis (Visual DNA) - NEW SECTION */}
        {plan.subject_analysis && (
            <div className="bg-indigo-500/5 p-6 rounded-2xl border border-indigo-500/20">
                <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Fingerprint size={14} /> Visual Identity Profile
                </h3>
                <p className="text-sm text-indigo-100/80 leading-relaxed italic">
                    "{plan.subject_analysis}"
                </p>
                <p className="text-[10px] text-indigo-300/50 mt-2 text-right">Extracted from references</p>
            </div>
        )}

        {/* Prompt */}
        <div className="space-y-3">
          <div className="flex justify-between items-center pl-1">
             <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest">Final Prompt</h3>
             <button 
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-[10px] font-medium bg-white/5 hover:bg-white/10 px-2 py-1 rounded text-white/60 hover:text-white transition-all"
             >
                {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                {copied ? "COPIED" : "COPY PROMPT"}
             </button>
          </div>
          <div className="bg-black/20 backdrop-blur-md p-6 rounded-2xl border border-white/5 font-mono text-sm text-gray-200 leading-relaxed shadow-inner">
            {plan.final_prompt_text}
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Configs */}
            <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4">Configuration</h3>
                <ul className="space-y-3 text-sm text-white/80">
                    <li className="flex justify-between items-center pb-2 border-b border-white/5">
                        <span className="text-white/50">Model</span> <span className="text-purple-200 font-medium">{plan.model_suggestion}</span>
                    </li>
                    <li className="flex justify-between items-center pb-2 border-b border-white/5">
                        <span className="text-white/50">Aspect Ratio</span> <span>{plan.image_config?.aspectRatio || "1:1"}</span>
                    </li>
                     <li className="flex justify-between items-center">
                        <span className="text-white/50">Resolution</span> <span>{plan.image_config?.imageSize || "1K"}</span>
                    </li>
                </ul>
            </div>

            {/* Quality Checks */}
            <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4">Quality Checks</h3>
                <ul className="space-y-3">
                    {plan.quality_checks?.map((check, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-white/70">
                            <CheckCircle2 size={16} className="text-green-400 mt-0.5 shrink-0" />
                            <span>{check}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>

        {/* Masking Recommendation */}
        {plan.masking_recommendation && plan.masking_recommendation.needs_mask && (
             <div className="bg-blue-500/5 p-6 rounded-2xl border border-blue-500/10">
                <h3 className="text-xs font-bold text-blue-300 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <ScanLine size={14} /> Masking Strategy
                </h3>
                <div className="text-sm text-white/80 space-y-3">
                    <p className="italic text-white/60">{plan.masking_recommendation.mask_guidance}</p>
                    <div className="flex flex-wrap gap-2">
                        {plan.masking_recommendation.mask_targets.map((target, i) => (
                             <span key={i} className="bg-blue-500/10 text-blue-200 px-3 py-1 rounded-full text-xs font-medium border border-blue-500/20">
                                {target}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* Warnings / Negatives */}
        {plan.negative_instructions && plan.negative_instructions.length > 0 && (
             <div className="space-y-3">
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest pl-1 flex items-center gap-2">
                    <AlertTriangle size={12} /> Negative Constraints
                </h3>
                <div className="flex flex-wrap gap-2">
                    {plan.negative_instructions.map((neg, i) => (
                        <span key={i} className="bg-red-500/10 text-red-200 px-3 py-1.5 rounded-lg text-xs border border-red-500/10">
                            {neg}
                        </span>
                    ))}
                </div>
             </div>
        )}
      </div>

      <div className="p-8 border-t border-white/5 bg-black/10 flex justify-end gap-4 sticky bottom-0 backdrop-blur-lg">
        <button 
            onClick={onCancel}
            className="px-6 py-3 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 transition-all"
            disabled={loading}
        >
            Modify Request
        </button>
        <button 
            onClick={onConfirm}
            disabled={loading}
            className="px-8 py-3 rounded-xl text-sm font-semibold text-white bg-white/10 border border-white/10 hover:bg-white/20 active:scale-95 transition-all shadow-lg hover:shadow-white/5 flex items-center gap-2"
            style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
                boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)'
            }}
        >
            {loading ? (
                <>
                 <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                 </svg>
                 Executing...
                </>
            ) : (
                "Execute Plan"
            )}
        </button>
      </div>
    </div>
  );
};

export default PlanViewer;