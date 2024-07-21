import json

import asyncio
import aiohttp 
import trueskill

PROXY_SERVER = ''

COOKIES = {
    'locale': 'en',
    '_ck': 'true',
    '_challonge_session_production': 'K2ovdTFrV0VBVitJUG92WmJEV05zZFV6VHFqSHkzSDZLL21WbzZmQ05xU2lJR014Umg4UmlkbUZZWmVOeExQWXI4cUw5WU9ER3k5NmxyQVpVWG5mb1hUSkxOdnlqNEZ3ZGFNc0pjekV6bHQ1UU9DdnMzeVE2ZTdUa1dnNFdrYVBYL0J0cXF2WFo4VHF5NFFaUVA5NlMrMWZPOFF5V21xa3pJVytzbzFqb0dNVDdNR2FPOVVvTU5DMW9PUDI1WUtHcUQ4YzlXQmdzWnl0S0VyeSswdWpEK0swenV5ZmZac3R6L1ZJWlF3WFg1anQzdldJdmlnbmpsUXg1Ni80NWYxb1hud2k3RmQ5OWNaMlJGbVZVTkZBTk16QlU3bzJMV3VrNnpGbU51TmcxVmg3WTNnUkVnNnI0NHNHaHE5bFlwKzJzb1RiSmpreVBDSm40eUNTVjNDM051UTQxODBNMWxObUNwNG1vaDBGMU13Ym1TTmNxWTloZk9RcFB5dDdmSlUzUEF3WC9pUVVTWUsveG5RTEkrL1RZY3dvZHloc0Z5WDc4V3hrVFhId2hOdkFJMnZIREJqZjB1bEZjYmFZOWlqai0tVFpPMFBzSkd3YVVOSHZjZ0Q2Wk5zQT09--f92ddd0b107ebee20db3c3b248ab3fe6e8d2553e',
    '__cf_bm': 'jngGyQI1nj3yI7EYtA0tixd.Va2AjJ7vsgM37Qk84Lw-1721477716-1.0.1.1-hYj7fvPjEhXjDqG9OaCX5w1WgbbgeaqJPFymUPC8UtfpaV0zByjnxcYl7QsLP6bsxWMbG.7ZNzNnE3fjt1e5RA',
    'TS01ec8394': '010fa0d6287bfff68939d402bf2b3a66ae62f8b96aec3f5fade1af811bd450e6c1d148898c5b24ada9c470b7c2ebe153b1c3cf74cdf791100165de6b7ffe98f56ab06f47ee',
    'cf_clearance': 'TFXT1kKw8XdsXRw2YvhQLOECKqH._MQ9b4ywE.cAamw-1721477718-1.0.1.1-FIqqZKBuPDJ91gnOQxyHM1aqFyrXE9V_o2rAH_khKWKI4fum3CjUboekMWaeW8OBElqt6kseNqAWK_.SJqhh7g',
}
HEADERS = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/png,image/svg+xml,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'DNT': '1',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0',
    }
    
trueskill.setup(
    mu=10,
    sigma=10/3,
    beta=10/6,
    tau=10/300,
    backend='mpmath'
    )

def get_players(teamstr, elos, aliases):
    player_strs = teamstr.rstrip(')').split(') ')
    players = {}
    for player_str in player_strs:
        if '(' not in player_str:
            continue
        player, rank = player_str.split(' (')
        player = player.strip().lower()
        if player in aliases:
            player = aliases[player]
        if player in elos:
            players[player] = elos[player]
        else:
            players[player] = trueskill.create_rating(mu=float(rank))
            
    return players

async def get_challonge_info(session, url):
    resp = await session.get(url)
    text = await resp.text()
    match_info_str = text.split("['TournamentStore'] = ")[1].split("; window._initialStoreState['ThemeStore'] = ")[0]
    match_info = json.loads(match_info_str)
    
    return match_info

async def main():
    aliases = {}
    with open('aliases.txt', 'r', encoding='utf-8') as f:
        # tab-separated list of aliases, where every line has all names of one player 
        # first of each line should be the main name (current bot name)
        for line in f:
            alias_list = line.split('\t')
            main_name = alias_list[0].strip().lower()
            for alias in alias_list:
                aliases[alias.strip().lower()] = main_name

    tourlist = []
    with open('tourlist.txt', 'r', encoding='utf-8') as f:
        for line in f:
            url = line.strip()
            if url not in tourlist:
                tourlist.append(url)
    
    # comment this out if tsui is asleep
    # tourlist = [PROXY_SERVER + tour for tour in tourlist]
    elos = {}
    
    connector = aiohttp.TCPConnector(limit=3)
    
    async with aiohttp.ClientSession(cookies=COOKIES, headers=HEADERS, connector=connector) as session:
        try:
            challonges = await asyncio.gather(*[get_challonge_info(session, url) for url in tourlist])
        except IndexError:
            input('matches not processed, need to replace cookies, press enter to close')
    
    for tour in challonges:
        teams = {}
        rounds = tour['matches_by_round']
        for round_info in rounds.values():
            for match in round_info:
                team1_id = match['player1']['id']
                team2_id = match['player2']['id']
                if team1_id not in teams:
                    teams[team1_id] = get_players(match['player1']['display_name'], elos, aliases)
                if team2_id not in teams:
                    teams[team2_id] = get_players(match['player2']['display_name'], elos, aliases)
                
                if not match['winner_id']:
                    team1 = teams[team1_id]
                    team2 = teams[team2_id]
                    new_ratings = trueskill.rate([team1, team2], ranks=[0,0])
                    teams[team1_id] = new_ratings[0]
                    teams[team2_id] = new_ratings[1]
                else:
                    winner_id = match['winner_id']
                    loser_id = match['loser_id']
                    winner_team = teams[winner_id]
                    loser_team = teams[loser_id]
                    new_ratings = trueskill.rate([winner_team, loser_team])
                    teams[winner_id] = new_ratings[0]
                    teams[loser_id] = new_ratings[1]
        for team in teams.values():
            elos.update(team)
    
    with open('elos.json', 'w', encoding='utf-8') as f:
        elos_print = {player: round(rating.mu, 2) for player, rating in sorted(elos.items(), key=lambda elo: elo[1], reverse=True)}
        json.dump(elos_print, f, indent='\t')
    
    tierlist = {}
    for player, rating in elos_print.items():
        rating_int = int(round(rating))
        if rating_int not in tierlist:
            tierlist[rating_int] = [player]
        else:
            tierlist[rating_int].append(player)
    
    with open('elo_adjusted_tl.txt', 'w', encoding='utf-8') as f:
        tiers = sorted(list(tierlist.keys()), reverse=True)
        for tier in tiers:
            f.write(f'{tier}: {", ".join(tierlist[tier])}\n')
    
    with open('elo_adjusted_tl_finegrained.txt', 'w', encoding='utf-8') as f:
        tiers = sorted(list(tierlist.keys()), reverse=True)
        for tier in tiers:
            f.write(f'{tier}: {", ".join([f"{player} ({elos_print[player]})" for player in tierlist[tier]])}\n')
        
if __name__ == '__main__':
    asyncio.run(main())