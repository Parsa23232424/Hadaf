export default async function handler(req, res) {
  const response = await fetch(
    "https://v3.football.api-sports.io/fixtures?live=all",
    {
      headers: {
  "x-apisports-key": "cfff451286add902c5d0704851db46c5"
      }

  const data = await response.json();
  res.status(200).json(data);
}
