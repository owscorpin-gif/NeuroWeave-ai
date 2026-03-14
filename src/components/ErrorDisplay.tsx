import React from "react";
import { AlertCircle, RefreshCcw, ShieldAlert, ZapOff, WifiOff, Lock } from "lucide-react";
import { ErrorCode, mapErrorToUserFriendly } from "../utils/errors";
import { motion } from "motion/react";

interface ErrorDisplayProps {
  error: any;
  onRetry?: () => void;
  className?: string;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, onRetry, className }) => {
  if (!error) return null;

  const { code, message, guidance } = mapErrorToUserFriendly(error);

  const getIcon = () => {
    switch (code) {
      case ErrorCode.SAFETY_BLOCKED:
      case ErrorCode.MALICIOUS_PROMPT:
        return <ShieldAlert className="text-red-400" size={24} />;
      case ErrorCode.QUOTA_EXCEEDED:
        return <ZapOff className="text-amber-400" size={24} />;
      case ErrorCode.NETWORK_ERROR:
        return <WifiOff className="text-gray-400" size={24} />;
      case ErrorCode.PERMISSION_DENIED:
        return <Lock className="text-red-400" size={24} />;
      default:
        return <AlertCircle className="text-red-400" size={24} />;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-2xl bg-red-500/5 border border-red-500/20 flex gap-4 ${className}`}
    >
      <div className="mt-1">{getIcon()}</div>
      <div className="flex-1">
        <h4 className="text-sm font-bold text-white mb-1">{message}</h4>
        <p className="text-xs text-gray-400 leading-relaxed mb-3">{guidance}</p>
        
        {onRetry && (
          <button 
            onClick={onRetry}
            className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-accent hover:text-white transition-colors"
          >
            <RefreshCcw size={12} />
            Attempt Recovery
          </button>
        )}
      </div>
    </motion.div>
  );
};
