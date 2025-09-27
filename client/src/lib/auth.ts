import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { auth } from "./firebase";
import { apiRequest } from "./queryClient";

const provider = new GoogleAuthProvider();

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, provider);
    
    if (result?.user) {
      // Send user data to backend
      const response = await apiRequest("POST", "/api/auth/login", {
        email: result.user.email,
        displayName: result.user.displayName,
        photoUrl: result.user.photoURL,
      });
      
      const data = await response.json();
      return data;
    }
    
    return null;
  } catch (error) {
    console.error("Sign in error:", error);
    throw error;
  }
}


export async function signOutUser() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Sign out error:", error);
    throw error;
  }
}
