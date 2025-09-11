import { getAuth, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signOut } from "firebase/auth";
import { auth } from "./firebase";
import { apiRequest } from "./queryClient";

const provider = new GoogleAuthProvider();

export async function signInWithGoogle() {
  try {
    await signInWithRedirect(auth, provider);
  } catch (error) {
    console.error("Sign in error:", error);
    throw error;
  }
}

export async function handleRedirectResult() {
  try {
    const result = await getRedirectResult(auth);
    if (result?.user) {
      // Send user data to backend
      const response = await apiRequest("POST", "/api/auth/login", {
        email: result.user.email,
        displayName: result.user.displayName,
        photoUrl: result.user.photoURL,
      });
      return await response.json();
    }
    return null;
  } catch (error) {
    console.error("Redirect result error:", error);
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
