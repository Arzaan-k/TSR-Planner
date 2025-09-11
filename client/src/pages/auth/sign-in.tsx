import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { signInWithGoogle, handleRedirectResult } from "@/lib/auth";
import { useAuth } from "@/hooks/use-auth";
import { LogIn, Loader2 } from "lucide-react";

export default function SignIn() {
  const { setUser, loading } = useAuth();

  useEffect(() => {
    const checkRedirectResult = async () => {
      try {
        const result = await handleRedirectResult();
        if (result?.user) {
          setUser(result.user, result.role);
        }
      } catch (error) {
        console.error("Failed to handle redirect result:", error);
      }
    };

    checkRedirectResult();
  }, [setUser]);

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Sign in failed:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" data-testid="sign-in-page">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-foreground">
            Welcome to TSR Planner
          </CardTitle>
          <p className="text-muted-foreground">
            Sign in to manage your team tasks and meetings
          </p>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleSignIn}
            className="w-full"
            size="lg"
            data-testid="button-google-signin"
          >
            <LogIn className="w-5 h-5 mr-2" />
            Sign in with Google
          </Button>
          
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>
              By signing in, you agree to our terms of service and privacy policy.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
