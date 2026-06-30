export async function GET() {
  try {
    const res = await fetch(
      "https://v3.football.api-sports.io/fixtures?live=all",
      {
        method: "GET",
        headers: {
          "x-apisports-key": process.env.FOOTBALL_API_KEY
        }
      }
    );

    const data = await res.json();

    // فقط بازی‌های زنده رو تمیز برمی‌گردونیم
    const liveMatches = (data.response || []).map((match) => ({
      home: match.teams.home.name,
      away: match.teams.away.name,
      homeGoals: match.goals.home,
      awayGoals: match.goals.away,
      minute: match.fixture.status.elapsed,
      status: match.fixture.status.short
    }));

    return Response.json({
      success: true,
      count: liveMatches.length,
      matches: liveMatches
    });

  } catch (err) {
    return Response.json({
      success: false,
      error: err.message
    });
  }
}
