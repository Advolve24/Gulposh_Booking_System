import { useAuth } from "../store/authStore";

export default function ProtectedAction({ onAuthed, children, className }) {
  const { user, openAuth } = useAuth();

  const handleClick = () => {
    if (!user) {
      openAuth(); 
    } else {
      onAuthed?.();
    }
  };

  return (
    <button onClick={handleClick} className={className || "bg-black text-white px-4 py-2 rounded"}>
      {children || "Proceed"}
    </button>
  );
}
