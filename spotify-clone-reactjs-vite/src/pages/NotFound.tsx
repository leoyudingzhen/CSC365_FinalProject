import { useNavigate } from "react-router-dom";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-emerald-900/10">
      <div className="text-center px-8 py-12 max-w-2xl">
        <div className="relative mb-8">
          <h1 className="text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600 animate-pulse">
            404
          </h1>
          <div className="absolute inset-0 blur-3xl opacity-30 bg-gradient-to-r from-emerald-500 to-emerald-600 -z-10" />
        </div>

        <h2 className="text-3xl font-bold text-white mb-4">
          Oops! Track Not Found
        </h2>
        
        <p className="text-zinc-400 text-lg mb-8">
          The page or content you're looking for doesn't exist or has been moved.
          It might be a broken link, or the resource is no longer available.
        </p>

        <div className="flex gap-4 justify-center">
          <button
            onClick={() => navigate("/")}
            className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-full font-semibold shadow-lg shadow-emerald-500/30 hover:shadow-emerald-400/40 transition-all duration-200 transform hover:scale-105"
          >
            Go Home
          </button>
          
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full font-semibold border border-zinc-700 hover:border-emerald-500/30 transition-all duration-200 transform hover:scale-105"
          >
            Go Back
          </button>
        </div>

        <div className="mt-12 text-zinc-500 text-sm">
          <p>Lost? Try searching for your favorite artist or song!</p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
