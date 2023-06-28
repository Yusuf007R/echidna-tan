const milisecondsToMinutes = (miliseconds: number) => {
  const seconds = miliseconds / 1000;
  const hours = seconds / 3600;
  const minutes = (seconds % 3600) / 60;
  
  return [hours, minutes, seconds % 60].map((val) => `0${Math.floor(val)}`.slice(-2)).join(':');
};

export default milisecondsToMinutes;
