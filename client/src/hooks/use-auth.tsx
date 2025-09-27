import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { apiRequest } from "@/lib/queryClient";

interface User {
  id: string;
  email: string;
  displayName?: string;
  photoUrl?: string;
  isAdmin: boolean;
}

interface AuthContextType {
  user: User | null;
  role: string;
  loading: boolean;
  setUser: (user: User | null, role?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [role, setRole] = useState<string>("Member");
  const [loading, setLoading] = useState(true);

  const setUser = (newUser: User | null, newRole?: string) => {
    setUserState(newUser);
    if (newRole) {
      setRole(newRole);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Retry logic for database connection issues
          let retries = 3;
          let lastError;
          
          while (retries > 0) {
            try {
              // User is signed in, get or create user in our backend
              const response = await apiRequest("POST", "/api/auth/login", {
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                photoUrl: firebaseUser.photoURL,
              });

              const data = await response.json();
              setUser(data.user, data.role);
              break; // Success, exit retry loop
            } catch (apiError) {
              lastError = apiError;
              console.error(`API request failed (${4 - retries}/3):`, apiError);
              
              // Check if it's a retryable error (database connection issues)
              if (apiError.message?.includes("500") || 
                  apiError.message?.includes("503") || 
                  apiError.message?.includes("Login failed") ||
                  apiError.message?.includes("temporarily unavailable")) {
                retries--;
                if (retries > 0) {
                  // Wait before retry (exponential backoff)
                  await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries)));
                  continue;
                }
              }
              throw apiError;
            }
          }
          
          if (retries === 0 && lastError) {
            throw lastError;
          }
        } else {
          // User is signed out
          setUser(null);
          setRole("Member");
        }
      } catch (error) {
        console.error("Auth state change error:", error);
        // Don't clear user state on database errors - keep Firebase auth state
        // Only clear if it's a real auth error
        if (error.message?.includes("401") || error.message?.includes("403")) {
          setUser(null);
          setRole("Member");
        } else {
          // For database errors, create a temporary user state
          setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email || "",
            displayName: firebaseUser.displayName || undefined,
            photoUrl: firebaseUser.photoURL || undefined,
            isAdmin: false,
          }, "Member");
        }
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // During HMR, context might be temporarily undefined
    if (import.meta.hot) {
      return { user: null, role: "Member", loading: true, setUser: () => {} };
    }
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
