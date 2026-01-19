import { SignedIn, SignedOut, UserButton, SignInButton } from '@clerk/nextjs';

export function AuthHeader() {
  return (
    <div className="fixed top-4 right-4 z-10 flex items-center gap-4">
      <SignedIn>
        <div className="flex items-center gap-3">
          <UserButton />
        </div>
      </SignedIn>
      <SignedOut>
        <SignInButton>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium shadow">
            Sign In
          </button>
        </SignInButton>
      </SignedOut>
    </div>
  );
}
