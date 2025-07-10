import React from "react";
import { useRouter } from "next/navigation";
import { ProStatusProps } from "@/types";

const ProStatus: React.FC<ProStatusProps> = ({ hasProAccess, username }) => {
  const router = useRouter();

  const handleUpgradeClick = () => {
    // Navigate to the upgrade page
    router.push("/upgrade");
  };

  return (
    <div className="flex items-center space-x-4">
      {hasProAccess ? (
        <>
          <span
            className="px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm rounded-full whitespace-nowrap flex items-center justify-center"
            style={{ minWidth: "90px" }}
          >
            Pro Member
          </span>
          {username && (
            <span
              className="text-sm font-bold text-white dark:text-white ml-1 drop-shadow-sm"
              style={{ textShadow: "0 1px 4px rgba(80,0,80,0.15)" }}
            >
              {username}
            </span>
          )}
        </>
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
