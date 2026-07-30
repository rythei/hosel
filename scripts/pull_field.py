#!/usr/bin/env python3
"""
Pull a tournament field from ESPN and output a CSV ready for
Hosel admin import (player_name, odds, world_ranking).

World ranking is not available from ESPN — the column is left blank for
you to fill in, or leave empty (the admin page doesn't require it).

Usage:
    python scripts/pull_field.py <espn_event_id>
    python scripts/pull_field.py <espn_event_id> --tour lpga
    python scripts/pull_field.py <espn_event_id> --odds-api-key <key> -o field.csv

ESPN event IDs appear in any ESPN golf leaderboard URL:
    https://www.espn.com/golf/leaderboard?event=401580344
                                                   ^^^^^^^^^

The scoreboard is league-scoped, so non-PGA events need --tour
(pga, lpga, champions-tour, liv, dpwt). Passing the wrong tour is
detected and reported rather than silently returning another event.

Odds (optional): get a free key at https://the-odds-api.com
Free tier = 500 requests/month, plenty for this use case.
"""

import sys
import json
import csv
import io
import argparse
import urllib.request
import urllib.error


def _get(url: str) -> dict:
    try:
        with urllib.request.urlopen(url, timeout=10) as resp:
            return json.load(resp)
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code} — {url}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


TOURS = ["pga", "lpga", "champions-tour", "liv", "dpwt"]


def fetch_field(event_id: str, tour: str = "pga") -> list[dict]:
    url = (
        f"https://site.api.espn.com/apis/site/v2/sports/golf/{tour}/scoreboard"
        f"?event={event_id}"
    )
    data = _get(url)

    try:
        event = data["events"][0]
        competitors = event["competitions"][0]["competitors"]
    except (KeyError, IndexError):
        print("Could not parse ESPN response — check the event ID.", file=sys.stderr)
        sys.exit(1)

    # ESPN ignores an event ID that isn't in the requested league and returns
    # that league's current event instead, so verify we got what we asked for.
    if str(event.get("id")) != str(event_id):
        print(
            f"ESPN returned event {event.get('id')} ({event.get('name')!r}) when asked "
            f"for {event_id} on the '{tour}' tour.\n"
            f"That event ID probably belongs to a different tour — try --tour "
            f"with one of: {', '.join(TOURS)}",
            file=sys.stderr,
        )
        sys.exit(1)

    players = []
    for c in competitors:
        name = (c.get("athlete") or {}).get("displayName", "").strip()
        if name:
            players.append({"player_name": name, "odds": "", "world_ranking": ""})

    # Sort alphabetically so the CSV is easy to scan before import
    players.sort(key=lambda p: p["player_name"].split()[-1])
    return players


def fetch_odds(api_key: str) -> dict[str, str]:
    """
    Fetch PGA Tour outright winner odds from The Odds API.
    Returns {lowercased_name: american_odds_string}.
    """
    url = (
        "https://api.the-odds-api.com/v4/sports/golf_pga/odds/"
        f"?apiKey={api_key}&regions=us&markets=outrights&oddsFormat=american"
    )
    data = _get(url)

    odds_map: dict[str, str] = {}
    for event in data:
        for bookmaker in event.get("bookmakers", [])[:1]:  # first bookmaker only
            for market in bookmaker.get("markets", []):
                if market.get("key") != "outrights":
                    continue
                for outcome in market.get("outcomes", []):
                    name = outcome.get("name", "").strip()
                    price = outcome.get("price")
                    if not name or price is None:
                        continue
                    formatted = f"+{int(price)}" if price > 0 else str(int(price))
                    odds_map[name.lower()] = formatted

    return odds_map


def match_odds(player_name: str, odds_map: dict[str, str]) -> str:
    lower = player_name.lower()

    # Exact match
    if lower in odds_map:
        return odds_map[lower]

    # Last-name match (handles "Matt Fitzpatrick" vs "M. Fitzpatrick")
    last = lower.split()[-1]
    matches = [(k, v) for k, v in odds_map.items() if k.split()[-1] == last]
    if len(matches) == 1:
        return matches[0][1]

    return ""


def main():
    parser = argparse.ArgumentParser(
        description="Pull PGA Tour field → Hosel CSV",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("event_id", help="ESPN event ID (e.g. 401580344)")
    parser.add_argument("--tour", default="pga", choices=TOURS,
                        help="ESPN tour the event belongs to (default: pga)")
    parser.add_argument("--odds-api-key", metavar="KEY", help="The Odds API key (optional)")
    parser.add_argument("--output", "-o", metavar="FILE", help="Write to file instead of stdout")
    args = parser.parse_args()

    print(f"Fetching field for ESPN event {args.event_id} ({args.tour})...", file=sys.stderr)
    players = fetch_field(args.event_id, args.tour)
    print(f"Found {len(players)} players.", file=sys.stderr)

    if args.odds_api_key:
        print("Fetching odds from The Odds API...", file=sys.stderr)
        odds_map = fetch_odds(args.odds_api_key)
        matched = 0
        for p in players:
            p["odds"] = match_odds(p["player_name"], odds_map)
            if p["odds"]:
                matched += 1
        print(f"Matched odds for {matched}/{len(players)} players.", file=sys.stderr)

    out = io.StringIO()
    writer = csv.DictWriter(out, fieldnames=["player_name", "odds", "world_ranking"])
    writer.writeheader()
    writer.writerows(players)
    csv_text = out.getvalue()

    if args.output:
        with open(args.output, "w", newline="") as f:
            f.write(csv_text)
        print(f"Written to {args.output}", file=sys.stderr)
    else:
        print(csv_text, end="")


if __name__ == "__main__":
    main()
