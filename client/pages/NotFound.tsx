import { useLocation, Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { FileQuestion, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[#F0F2F5] flex items-center justify-center p-4 font-sans text-slate-900">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, type: "spring", bounce: 0.3 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-100"
      >
        {/* Icon Bubble */}
        <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
          <FileQuestion className="w-10 h-10 text-indigo-600" />
        </div>
        
        {/* Typography */}
        <h1 className="text-4xl font-bold text-slate-900 mb-2 tracking-tight">404</h1>
        <h2 className="text-lg font-semibold text-slate-700 mb-3">Page Not Found</h2>
        
        <p className="text-slate-500 mb-8 leading-relaxed text-sm">
          The page you are looking for doesn't exist or has been moved. 
          Please check the URL or try navigating back.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button 
            onClick={() => navigate(-1)}
            variant="outline" 
            className="w-full sm:w-auto flex items-center justify-center space-x-2 border-slate-200 hover:bg-slate-50 text-slate-700 h-11 rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </Button>
          
          <Link to="/" className="w-full sm:w-auto">
            <Button className="w-full h-11 flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg transition-all rounded-xl">
              <Home className="w-4 h-4" />
              <span>Return Home</span>
            </Button>
          </Link>
        </div>
        
        <div className="mt-8 pt-6 border-t border-slate-100 text-xs text-slate-400">
          Error Code: 404 • Path: {location.pathname}
        </div>
      </motion.div>
    </div>
  );
};

export default NotFound;
