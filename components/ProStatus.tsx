import React from "react";
import { useRouter } from "next/navigation";

interface ProStatusProps {
  hasProAccess: boolean;
  username: string | null;
}

const ProStatus: React.FC<ProStatusProps> = ({ hasProAccess, username }) => {
  const router = useRouter();

  const handleUpgradeClick = () => {
    // Navigate to the upgrade page
    router.push("/upgrade");
  };

  return (
    <div className="flex items-center space-x-4">
      {hasProAccess ? (
        <div className="flex items-center space-x-2">
          <span className="px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm rounded-full">
            Pro Member
          </span>
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {username}
          </span>
        </div>
      ) : (
        <button
          onClick={handleUpgradeClick}
          className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          Upgrade to Pro
        </button>
      )}
    </div>
  );
};

export default ProStatus;
