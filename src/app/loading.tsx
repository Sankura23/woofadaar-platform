export default function Loading() {
  return (
    <div className="min-h-screen bg-[#fef8e8] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3bbca8] mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-[#171717] mb-2">Loading...</h2>
        <p className="text-[#525252]">Please wait while we prepare your content</p>
      </div>
    </div>
  );
}