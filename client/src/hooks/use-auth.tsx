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
          // User is signed in, get or create user in our backend
          const response = await apiRequest("POST", "/api/auth/login", {
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoUrl: firebaseUser.photoURL,
          });
          
          const data = await response.json();
          setUser(data.user, data.role);
        } else {
          // User is signed out
          setUser(null);
          setRole("Member");
        }
      } catch (error) {
        console.error("Auth state change error:", error);
        setUser(null);
        setRole("Member");
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
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
