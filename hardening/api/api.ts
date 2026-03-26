const API = "http://localhost:8000/api";

export const getData = async (url: string) => {
  const res = await fetch(API + url);
  return await res.json();
};