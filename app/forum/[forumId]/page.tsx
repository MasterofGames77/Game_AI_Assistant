"use client";

import { useState, useEffect } from "react";
import { useForum } from "../../../context/ForumContext";
import { ForumProvider } from "../../../context/ForumContext";
import axios from "axios";
import { useRouter } from "next/navigation";
import PrivateForumUserManagement from "../../../components/PrivateForumUserManagement";
import toast from "react-hot-toast";
import Image from "next/image";

export default function ForumPageWrapper({
  params,
}: {
  params: { forumId: string };
}) {
  return (
    <ForumProvider>
      <ForumPage params={params} />
    </ForumProvider>
  );
}

function ForumPage({ params }: { params: { forumId: string } }) {
  const {
    currentForum,
    setCurrentForum,
    addPost,
    editPost,
    deletePost,
    likePost,
    updateForumUsers,
  } = useForum();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editMessage, setEditMessage] = useState("");
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [editSelectedImages, setEditSelectedImages] = useState<File[]>([]);
  const [editImagePreviews, setEditImagePreviews] = useState<string[]>([]);
  const [editExistingAttachments, setEditExistingAttachments] = useState<any[]>(
    []
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchForum = async () => {
      try {
        const username = localStorage.getItem("username") || "test-user";
        const response = await axios.get(
          `/api/getForumTopic?forumId=${params.forumId}&username=${username}`
        );
        setCurrentForum(response.data);
        setLoading(false);
      } catch (err: any) {
        setError(err.message || "Failed to load forum");
        setLoading(false);
      }
    };

    fetchForum();
  }, [params.forumId, setCurrentForum]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // Limit to 5 images
    if (files.length + selectedImages.length > 5) {
      setError("Maximum 5 images allowed per post");
      return;
    }

    // Validate file types and sizes
    const validFiles: File[] = [];
    const previews: string[] = [];

    files.forEach((file) => {
      // Check file type
      if (!file.type.startsWith("image/")) {
        setError(`${file.name} is not a valid image file`);
        return;
      }

      // Check file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError(`${file.name} exceeds 10MB size limit`);
        return;
      }

      validFiles.push(file);
      previews.push(URL.createObjectURL(file));
    });

    setSelectedImages([...selectedImages, ...validFiles]);
    setImagePreviews([...imagePreviews, ...previews]);
  };

  const removeImage = (index: number) => {
    // Revoke object URL to free memory
    URL.revokeObjectURL(imagePreviews[index]);

    setSelectedImages(selectedImages.filter((_, i) => i !== index));
    setImagePreviews(imagePreviews.filter((_, i) => i !== index));
  };

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && selectedImages.length === 0) {
      setError("Please enter a message or attach an image");
      return;
    }

    try {
      await addPost(
        params.forumId,
        message,
        selectedImages.length > 0 ? selectedImages : undefined
      );
      setMessage("");
      setSelectedImages([]);
      // Clean up preview URLs
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));
      setImagePreviews([]);

      // Reset file input
      const fileInput = document.getElementById(
        "image-upload"
      ) as HTMLInputElement;
      if (fileInput) fileInput.value = "";

      // Fetch updated forum data
      const username = localStorage.getItem("username") || "test-user";
      const response = await axios.get(
        `/api/getForumTopic?forumId=${params.forumId}&username=${username}`
      );
      setCurrentForum(response.data);
    } catch (err: any) {
      // Handle image moderation errors with violation tracking
      if (err.response?.status === 400 || err.response?.status === 403) {
        const errorData = err.response?.data;

        // Check if this is a content violation (warning/ban)
        if (errorData?.isContentViolation || errorData?.violationResult) {
          const violationResult = errorData.violationResult;

          if (violationResult?.action === "banned") {
            const message =
              errorData.message ||
              "Your account has been suspended due to content violations.";
            setError(message);
            toast.error(message, {
              duration: 8000,
              style: {
                background: "#fee2e2",
                color: "#991b1b",
                border: "1px solid #fca5a5",
              },
            });
          } else if (violationResult?.action === "permanent_ban") {
            const message =
              errorData.message ||
              "Your account has been permanently suspended.";
            setError(message);
            toast.error(message, {
              duration: 8000,
              style: {
                background: "#fee2e2",
                color: "#991b1b",
                border: "1px solid #fca5a5",
              },
            });
          } else {
            // Warning - show violation message
            const message =
              errorData.message ||
              `Your image contains inappropriate content. Warning (${
                violationResult?.count || 1
              }/3).`;
            const details =
              errorData.details ||
              "The image contains content that violates our community guidelines";
            setError(message);
            toast.error(`${message} ${details}`, {
              duration: 6000,
              style: {
                background: "#fee2e2",
                color: "#991b1b",
                border: "1px solid #fca5a5",
              },
            });
          }
        } else if (
          errorData?.error === "Image contains inappropriate content"
        ) {
          // Image rejected but no violation (shouldn't happen, but handle gracefully)
          const details =
            errorData.details ||
            "The image contains content that violates our community guidelines";
          setError(`Image Rejected: ${details}`);
          toast.error(
            `Image Rejected: ${details}. Please choose a different image.`,
            {
              duration: 6000,
              style: {
                background: "#fee2e2",
                color: "#991b1b",
                border: "1px solid #fca5a5",
              },
            }
          );
        } else {
          // Check if this is an image upload error
          if ((err as any).isUploadError) {
            const errorMessage =
              errorData?.message ||
              errorData?.error ||
              err.message ||
              "Failed to upload image to forum";
            console.error("Image upload failed:", errorMessage, errorData);
            toast.error(
              "Unable to upload image. Please try again or post without an image.",
              {
                duration: 5000,
                style: {
                  background: "#fef3c7",
                  color: "#92400e",
                  border: "1px solid #fcd34d",
                },
              }
            );
          } else {
            // Other errors
            const errorMessage =
              errorData?.error ||
              errorData?.message ||
              err.message ||
              "Failed to add post";
            setError(errorMessage);
            toast.error(errorMessage);
          }
        }
      } else {
        // For other errors, show in error state
        const errorMessage =
          err.response?.data?.error || err.message || "Failed to add post";
        setError(errorMessage);
        toast.error(errorMessage);
      }
    }
  };

  const handleEditPost = (
    postId: string,
    currentMessage: string,
    existingAttachments?: any[]
  ) => {
    setEditingPostId(postId);
    setEditMessage(currentMessage);
    // Load existing attachments
    setEditExistingAttachments(existingAttachments || []);
    setEditSelectedImages([]);
    setEditImagePreviews([]);
  };

  const handleSaveEdit = async (postId: string) => {
    // Allow empty message if there are attachments (existing or new)
    const hasMessage = editMessage.trim().length > 0;
    const hasExistingAttachments = editExistingAttachments.length > 0;
    const hasNewImages = editSelectedImages.length > 0;

    if (!hasMessage && !hasExistingAttachments && !hasNewImages) {
      setError("Please enter a message or attach an image");
      return;
    }

    try {
      // Combine existing attachments with new images
      await editPost(
        params.forumId,
        postId,
        editMessage.trim() || "", // Allow empty message for image-only posts
        editSelectedImages.length > 0 ? editSelectedImages : undefined,
        editExistingAttachments
      );
      setEditingPostId(null);
      setEditMessage("");
      setEditSelectedImages([]);
      // Clean up preview URLs
      editImagePreviews.forEach((url) => URL.revokeObjectURL(url));
      setEditImagePreviews([]);
      setEditExistingAttachments([]);

      // Reset file input
      const fileInput = document.getElementById(
        "edit-image-upload"
      ) as HTMLInputElement;
      if (fileInput) fileInput.value = "";

      // Fetch updated forum data
      const username = localStorage.getItem("username") || "test-user";
      const response = await axios.get(
        `/api/getForumTopic?forumId=${params.forumId}&username=${username}`
      );
      setCurrentForum(response.data);
    } catch (err: any) {
      // Handle image moderation errors
      if (err.response?.status === 400 || err.response?.status === 403) {
        const errorData = err.response?.data;
        if (errorData?.isContentViolation || errorData?.violationResult) {
          const violationResult = errorData.violationResult;
          if (
            violationResult?.action === "banned" ||
            violationResult?.action === "permanent_ban"
          ) {
            setError(errorData.message || "Your account has been suspended.");
          } else {
            setError(
              errorData.message || "Image contains inappropriate content."
            );
          }
        } else {
          // Check if this is an image upload error
          if ((err as any).isUploadError) {
            const errorMessage =
              errorData?.message ||
              errorData?.error ||
              err.message ||
              "Failed to upload image";
            console.error(
              "Image upload failed (edit):",
              errorMessage,
              errorData
            );
            toast.error(
              "Unable to upload image. Your message will be saved, but the image could not be added.",
              {
                duration: 5000,
                style: {
                  background: "#fef3c7",
                  color: "#92400e",
                  border: "1px solid #fcd34d",
                },
              }
            );
            // Don't set error state for upload errors - allow post to be saved without image
          } else {
            setError(
              errorData?.error ||
                errorData?.message ||
                err.message ||
                "Failed to edit post"
            );
            toast.error(
              errorData?.error ||
                errorData?.message ||
                err.message ||
                "Failed to edit post"
            );
          }
        }
      } else {
        // Check if this is an image upload error
        if ((err as any).isUploadError) {
          console.error("Image upload failed (edit):", err.message);
          toast.error(
            "Unable to upload image. Your message will be saved, but the image could not be added.",
            {
              duration: 5000,
              style: {
                background: "#fef3c7",
                color: "#92400e",
                border: "1px solid #fcd34d",
              },
            }
          );
        } else {
          setError(err.message || "Failed to edit post");
          toast.error(err.message || "Failed to edit post");
        }
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingPostId(null);
    setEditMessage("");
    setEditSelectedImages([]);
    // Clean up preview URLs
    editImagePreviews.forEach((url) => URL.revokeObjectURL(url));
    setEditImagePreviews([]);
    setEditExistingAttachments([]);

    // Reset file input
    const fileInput = document.getElementById(
      "edit-image-upload"
    ) as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  const handleEditImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // Limit to 5 images total (existing + new)
    if (
      files.length +
        editSelectedImages.length +
        editExistingAttachments.length >
      5
    ) {
      setError("Maximum 5 images allowed per post");
      return;
    }

    // Validate file types and sizes
    const validFiles: File[] = [];
    const previews: string[] = [];

    files.forEach((file) => {
      // Check file type
      if (!file.type.startsWith("image/")) {
        setError(`${file.name} is not a valid image file`);
        return;
      }

      // Check file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError(`${file.name} exceeds 10MB size limit`);
        return;
      }

      validFiles.push(file);
      previews.push(URL.createObjectURL(file));
    });

    setEditSelectedImages([...editSelectedImages, ...validFiles]);
    setEditImagePreviews([...editImagePreviews, ...previews]);
  };

  const removeEditImage = (index: number, isNew: boolean) => {
    if (isNew) {
      // Remove new image
      URL.revokeObjectURL(editImagePreviews[index]);
      setEditSelectedImages(editSelectedImages.filter((_, i) => i !== index));
      setEditImagePreviews(editImagePreviews.filter((_, i) => i !== index));
    } else {
      // Remove existing attachment
      setEditExistingAttachments(
        editExistingAttachments.filter((_, i) => i !== index)
      );
    }
  };

  const handleDeletePost = (postId: string) => {
    setPostToDelete(postId);
    setShowDeleteConfirm(true);
  };

  const confirmDeletePost = async () => {
    if (!postToDelete) return;

    try {
      await deletePost(params.forumId, postToDelete);
      setShowDeleteConfirm(false);
      setPostToDelete(null);
      // Fetch updated forum data
      const username = localStorage.getItem("username") || "test-user";
      const response = await axios.get(
        `/api/getForumTopic?forumId=${params.forumId}&username=${username}`
      );
      setCurrentForum(response.data);
    } catch (err: any) {
      setError(
        err.response?.data?.error || err.message || "Failed to delete post"
      );
      setShowDeleteConfirm(false);
      setPostToDelete(null);
    }
  };

  const cancelDeletePost = () => {
    setShowDeleteConfirm(false);
    setPostToDelete(null);
  };

  const handleLikePost = async (postId: string) => {
    try {
      await likePost(params.forumId, postId);
      // Fetch updated forum data so the UI reflects the new like state/count
      const username = localStorage.getItem("username") || "test-user";
      const response = await axios.get(
        `/api/getForumTopic?forumId=${params.forumId}&username=${username}`
      );
      setCurrentForum(response.data);
    } catch (err: any) {
      setError(err.message || "Failed to like post");
    }
  };

  if (loading) {
    return <div className="text-center">Loading forum...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (!currentForum) {
    return <div>Forum not found</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
              Delete Post
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Are you sure you want to delete this post? This action cannot be
              undone.
            </p>
            <div className="flex space-x-4 justify-end">
              <button
                onClick={cancelDeletePost}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeletePost}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => router.push("/")}
        className="mb-4 px-4 py-2 rounded font-semibold transition
          bg-gray-200 text-gray-800 hover:bg-gray-300
          dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600
          border border-gray-300 dark:border-gray-600
          shadow"
      >
        ← Back to Main Page
      </button>

      {/* Forum Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{currentForum.title}</h1>
        <div className="mb-2 text-gray-800 dark:text-gray-200">
          <p>Game: {currentForum.gameTitle}</p>
          <p>Category: {currentForum.category}</p>
          <p>Status: {currentForum.metadata.status}</p>
          <p>Total Posts: {currentForum.posts?.length || 0}</p>
          <p>Views: {currentForum.metadata.viewCount}</p>
          {currentForum.isPrivate && (
            <p className="text-blue-600 font-semibold">🔒 Private Forum</p>
          )}
        </div>
      </div>

      {/* User Management for Private Forums */}
      {currentForum.isPrivate && (
        <PrivateForumUserManagement
          forumId={currentForum.forumId}
          allowedUsers={currentForum.allowedUsers}
          createdBy={currentForum.createdBy}
          currentUsername={localStorage.getItem("username") || "test-user"}
          onUsersUpdated={(newUsers) => {
            // Update the current forum state
            setCurrentForum({
              ...currentForum,
              allowedUsers: newUsers,
            });
          }}
        />
      )}

      <div className="mb-8">
        <form onSubmit={handlePostSubmit} className="space-y-4">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What's new..?"
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            rows={4}
          />

          {/* Image Upload Section */}
          <div className="space-y-2">
            <label
              htmlFor="image-upload"
              className="cursor-pointer inline-flex items-center px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              Attach Images (max 5)
            </label>
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageSelect}
              className="hidden"
            />

            {/* Image Previews */}
            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-32 object-cover rounded border border-gray-300 dark:border-gray-600"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Remove image"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <div className="text-red-500 text-sm">{error}</div>}

          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Post
          </button>
        </form>
      </div>

      <div className="space-y-4">
        {currentForum.posts
          ?.filter((post) => post && post._id && post.message)
          .map((post) => (
            <div
              key={post._id || `post-${Math.random()}`}
              className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="mb-2 text-gray-900 dark:text-gray-200">
                    Posted by {post.createdBy || post.username || "Unknown"} on{" "}
                    {post.timestamp
                      ? new Date(post.timestamp).toLocaleString()
                      : "Unknown date"}
                    {post.metadata?.edited && (
                      <span className="text-blue-500 dark:text-blue-400 text-sm ml-2 italic">
                        (edited
                        {post.metadata.editedAt
                          ? ` on ${new Date(
                              post.metadata.editedAt
                            ).toLocaleString()}`
                          : ""}
                        )
                      </span>
                    )}
                  </p>
                  {editingPostId === post._id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editMessage}
                        onChange={(e) => setEditMessage(e.target.value)}
                        placeholder="What's new..?"
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        rows={4}
                      />

                      {/* Image Upload Section for Editing */}
                      <div className="space-y-2">
                        <label
                          htmlFor="edit-image-upload"
                          className="cursor-pointer inline-flex items-center px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 mr-2"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          Add Images (max 5 total)
                        </label>
                        <input
                          id="edit-image-upload"
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleEditImageSelect}
                          className="hidden"
                        />

                        {/* Existing Attachments */}
                        {editExistingAttachments.length > 0 && (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                            {editExistingAttachments.map(
                              (attachment, index) => (
                                <div
                                  key={`existing-${index}`}
                                  className="relative group"
                                >
                                  <Image
                                    src={attachment.url}
                                    alt={
                                      attachment.name || `Image ${index + 1}`
                                    }
                                    width={200}
                                    height={200}
                                    className="w-full h-32 object-cover rounded border border-gray-300 dark:border-gray-600"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeEditImage(index, false)
                                    }
                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    aria-label="Remove image"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-4 w-4"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                      />
                                    </svg>
                                  </button>
                                </div>
                              )
                            )}
                          </div>
                        )}

                        {/* New Image Previews */}
                        {editImagePreviews.length > 0 && (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                            {editImagePreviews.map((preview, index) => (
                              <div
                                key={`new-${index}`}
                                className="relative group"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={preview}
                                  alt={`Preview ${index + 1}`}
                                  className="w-full h-32 object-cover rounded border border-gray-300 dark:border-gray-600"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeEditImage(index, true)}
                                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                  aria-label="Remove image"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M6 18L18 6M6 6l12 12"
                                    />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleSaveEdit(post._id)}
                          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Only show message if it exists (allow image-only posts) */}
                      {post.message && post.message.trim().length > 0 && (
                        <p className="whitespace-pre-wrap text-gray-900 dark:text-gray-100 mb-4">
                          {post.message}
                        </p>
                      )}
                      {/* Display attached images */}
                      {post.metadata?.attachments &&
                        Array.isArray(post.metadata.attachments) &&
                        post.metadata.attachments.length > 0 && (
                          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {post.metadata.attachments.map(
                              (attachment: any, idx: number) =>
                                attachment &&
                                attachment.type === "image" &&
                                attachment.url && (
                                  <div key={idx} className="relative">
                                    <Image
                                      src={attachment.url}
                                      alt={
                                        attachment.name || `Image ${idx + 1}`
                                      }
                                      width={800}
                                      height={600}
                                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer hover:opacity-90 transition-opacity"
                                      onClick={() =>
                                        window.open(attachment.url, "_blank")
                                      }
                                      unoptimized={attachment.url.startsWith(
                                        "http"
                                      )}
                                      style={{ width: "100%", height: "auto" }}
                                    />
                                  </div>
                                )
                            )}
                          </div>
                        )}
                    </>
                  )}
                  {editingPostId !== post._id && (
                    <div className="mt-2 flex items-center space-x-4">
                      <button
                        onClick={() => handleLikePost(post._id)}
                        className={`flex items-center space-x-1 ${
                          post.metadata.likedBy?.includes(
                            localStorage.getItem("username") || "test-user"
                          )
                            ? "text-blue-600"
                            : "text-gray-400"
                        } hover:text-blue-700`}
                      >
                        {/* Heart icon: filled if liked, outline if not */}
                        {post.metadata.likedBy?.includes(
                          localStorage.getItem("username") || "test-user"
                        ) ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 fill-current"
                            viewBox="0 0 20 20"
                          >
                            <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                          </svg>
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z"
                            />
                          </svg>
                        )}
                        <span>
                          {post.metadata.likes || 0} Like
                          {(post.metadata.likes || 0) !== 1 ? "s" : ""}
                        </span>
                      </button>
                      {post.createdBy ===
                        (localStorage.getItem("username") || "test-user") && (
                        <>
                          <button
                            onClick={() =>
                              handleEditPost(
                                post._id,
                                post.message,
                                post.metadata?.attachments || []
                              )
                            }
                            className="text-blue-500 hover:text-blue-700"
                          >
                            Edit Post
                          </button>
                          <button
                            onClick={() => handleDeletePost(post._id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            Delete Post
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

        {currentForum.posts?.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            No posts yet. Be the first to add a post!
          </div>
        )}
      </div>
    </div>
  );
}
