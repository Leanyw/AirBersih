export const createMarkerIcon = (color: string) => {
    return `data:image/svg+xml;base64,${btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
        <path fill="${color}" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
    `)}`;
  };
  
  export const MARKER_COLORS = {
    aman: '#10B981', // green
    rawan: '#F59E0B', // yellow
    tidak_aman: '#EF4444', // red
    user: '#3B82F6', // blue
  };