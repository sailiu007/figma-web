import { useAppStore } from '../../store/useAppStore';
import { CheckCircle2 } from 'lucide-react';

export default function Toast() {
  const toast = useAppStore(s => s.toast);
  if (!toast) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 fade-enter">
      <div className="glass-strong rounded-full px-5 py-3 flex items-center gap-2.5 shadow-2xl">
        <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{background:'linear-gradient(135deg,#10b981,#14b8a6)'}}>
          <CheckCircle2 className="w-4 h-4 text-white"/>
        </div>
        <span style={{fontWeight:500,fontSize:'.9rem'}}>{toast.msg}</span>
      </div>
    </div>
  );
}
