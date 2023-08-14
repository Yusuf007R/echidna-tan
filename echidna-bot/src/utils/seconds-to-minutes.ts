const milisecondsToReadable = (miliseconds: number) => {
  const seconds = miliseconds / 1000;
  const hours = seconds / 3600;
  const minutes = (seconds % 3600) / 60;
  const time = [minutes, seconds % 60];
  if (hours >= 1) time.unshift(hours);

  return time.map(val => `0${Math.floor(val)}`.slice(-2)).join(':');
};

export default milisecondsToReadable;
