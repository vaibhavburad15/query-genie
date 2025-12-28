import { ReactNode } from 'react';
import Logo from '@/components/Logo';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

const AuthLayout = ({ children, title, subtitle }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-background to-brand-100/50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left Side: Project Information */}
        <div className="space-y-6">
          <div className="flex justify-center mb-4">
            <Logo size="lg" />
          </div>
          <div className="text-center lg:text-left">
          </div>

          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-2">What is Query Genie?</h2>
              <p className="text-muted-foreground">
                Query Genie is an vaibhav burad-powered chatbot that allows you to interact with your databases using natural language.
                Instead of writing complex SQL queries, simply describe what you want to know in plain English, and our AI will
                convert it into optimized SQL queries and execute them against your database.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-foreground mb-2">How to Use It?</h2>
              <ul className="text-muted-foreground space-y-2">
                <li>• <strong>Connect:</strong> Link your MySQL database securely</li>
                <li>• <strong>Chat:</strong> Ask questions in natural language </li>
                <li>• <strong>Explore:</strong> View results in interactive tables </li>
                <li>• <strong>Generate:</strong> Get optimized SQL queries for your data needs</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Features</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                <div>• Natural Language to SQL</div>
                <div>• MySQL Integration</div>
                <div>• Clean Modern UI</div>
              </div>
            </div>
          </div>

          {/* Footer */}
         
        </div>
        

        {/* Right Side: Auth Form */}
        <div className="flex justify-center">
          <div className="w-full max-w-md">
            {/* Logo Header for Mobile */}
            <div className="text-center mb-8 lg:hidden">
              <Logo size="lg" className="justify-center mb-4" />
              <h1 className="text-display text-foreground mb-2">{title}</h1>
              {subtitle && (
                <p className="text-body text-muted-foreground">{subtitle}</p>
              )}
            </div>

            {/* Auth Form Card */}
            <div className="glass-elevated rounded-2xl p-8 shadow-brand-lg">
              {/* Title for Desktop */}
              <div className="hidden lg:block text-center mb-6">
                <h1 className="text-display text-foreground mb-2">{title}</h1>
                {subtitle && (
                  <p className="text-body text-muted-foreground">{subtitle}</p>
                )}
              </div>
              {children}
            </div>
          </div>
          
        </div>
      </div>
       <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 text-center">
  <p className="text-caption flex justify-center">
    Powered by Vaibhav Burad • Built for Professionals
  </p>
</div>

    </div>
  );
};

export default AuthLayout;
