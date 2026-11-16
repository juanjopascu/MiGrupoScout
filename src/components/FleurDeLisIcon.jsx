/**
 * Emblema vectorial Flor de Lis Scout (uso institucional sin emojis).
 */
export default function FleurDeLisIcon({ className = 'w-5 h-5', ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
      {...props}
    >
      {/* Petalo central */}
      <path d="M12 1.8C10.1 4.9 9.2 7.8 9.6 10.8C9.9 12.4 10.6 13.5 11.1 14.4H12.9C13.4 13.5 14.1 12.4 14.4 10.8C14.8 7.8 13.9 4.9 12 1.8Z" />
      {/* Petalo izquierdo */}
      <path d="M10.7 14.4C9.5 11.3 7.5 8.7 4.9 8.7C3.0 8.7 2.0 10.1 2.4 11.8C2.8 13.4 4.5 14.4 6.6 14.0C5.7 13.6 5.2 12.8 5.5 12.0C5.8 11.2 6.8 11.2 7.8 12.1C8.6 12.8 9.1 13.6 9.5 14.4H10.7Z" />
      {/* Petalo derecho */}
      <path d="M13.3 14.4C14.5 11.3 16.5 8.7 19.1 8.7C21.0 8.7 22.0 10.1 21.6 11.8C21.2 13.4 19.5 14.4 17.4 14.0C18.3 13.6 18.8 12.8 18.5 12.0C18.2 11.2 17.2 11.2 16.2 12.1C15.4 12.8 14.9 13.6 14.5 14.4H13.3Z" />
      {/* Anillo transversal */}
      <rect x="6.8" y="14.9" width="10.4" height="1.9" rx="0.95" />
      {/* Base inferior trifida */}
      <path d="M11.1 17.3H12.9C12.8 19.3 12.5 20.9 12 22.2C11.5 20.9 11.2 19.3 11.1 17.3ZM10.4 17.3H8.8C8.3 19.1 7.2 20.1 5.6 20.1C6.8 21.3 9.0 21.0 10.0 19.2C10.2 18.6 10.3 18.0 10.4 17.3ZM13.6 17.3H15.2C15.7 19.1 16.8 20.1 18.4 20.1C17.2 21.3 15.0 21.0 14.0 19.2C13.8 18.6 13.7 18.0 13.6 17.3Z" />
    </svg>
  );
}
