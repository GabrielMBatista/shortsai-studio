
import React, { useState } from 'react';
import { Video, AlertTriangle } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { User, IS_DEMO_LOGIN } from '../types';
import Loader from './Loader';

interface AuthScreenProps {
  onLogin: (user: User) => Promise<void>;
}

// Sub-component to isolate the hook execution
const GoogleLoginButton: React.FC<{ onSuccess: (tokenResponse: any) => void, disabled: boolean }> = ({ onSuccess, disabled }) => {
    const login = useGoogleLogin({
        onSuccess: onSuccess,
        onError: () => alert("Login Failed. Please check your console/network.")
    });

    return (
        <button onClick={() => login()} disabled={disabled} className="w-full bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-wait text-slate-900 font-semibold py-3.5 px-4 rounded-xl flex items-center justify-center transition-all transform hover:scale-[1.02] shadow-lg">
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" /><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
            Sign in with Google
        </button>
    );
};

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [isLoading, setIsLoading] = useState(false);
  
  const handleMockLogin = async () => {
    setIsLoading(true);
    // Admin credentials provided for backend integration
    const mockUser: User = {
      id: "58bbe119-6034-4e9b-960c-6f3679a75fc5",
      name: "Admin ShortsAI",
      email: "admin@shortsai.com",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=admin",
      apiKeys: {}
    };
    try {
        await onLogin(mockUser);
    } catch (e) {
        setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (tokenResponse: any) => {
      setIsLoading(true);
      try {
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const userInfo = await userInfoRes.json();

        const realUser: User = {
            id: userInfo.sub, 
            name: userInfo.name,
            email: userInfo.email,
            avatar: userInfo.picture,
            apiKeys: {} 
        };
        await onLogin(realUser);
      } catch (error) {
        console.error("Google Login Failed", error);
        alert("Login failed. Please try again.");
        setIsLoading(false);
      }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-600/20 rounded-full blur-3xl"></div>
      <div className="max-w-md w-full bg-slate-800/50 backdrop-blur-xl border border-slate-700 p-8 rounded-2xl shadow-2xl z-10 relative">
        
        {isLoading && (
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-50 rounded-2xl flex items-center justify-center">
                <Loader text="Authenticating..." />
            </div>
        )}

        <div className="text-center mb-8">
          <div className="bg-indigo-500/10 p-3 rounded-2xl inline-block mb-4 shadow-inner shadow-indigo-500/20">
            <Video className="w-10 h-10 text-indigo-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Welcome to ShortsAI</h1>
          <p className="text-slate-400">Create viral vertical videos with Gemini 2.5</p>
        </div>
        
        <div className="space-y-4 animate-fade-in-up">
            {IS_DEMO_LOGIN ? (
                <button onClick={handleMockLogin} disabled={isLoading} className="w-full bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-wait text-slate-900 font-semibold py-3.5 px-4 rounded-xl flex items-center justify-center transition-all transform hover:scale-[1.02] shadow-lg">
                    <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" /><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                    Continue as Admin User
                </button>
            ) : (
                <GoogleLoginButton onSuccess={handleGoogleSuccess} disabled={isLoading} />
            )}
            
            <p className="text-xs text-center text-slate-500 mt-4">
                {IS_DEMO_LOGIN ? 'Connected to Backend • Admin Mode' : 'Secure Login via Google'}
            </p>
            
            {!IS_DEMO_LOGIN && (
                <div className="flex items-center gap-2 p-3 bg-indigo-500/10 rounded-lg text-xs text-indigo-300 border border-indigo-500/20">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>Make sure VITE_GOOGLE_CLIENT_ID is set in your environment.</span>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
