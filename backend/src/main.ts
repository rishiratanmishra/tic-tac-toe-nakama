import {
    createRoomRpc,
    ensureGlobalRankingLeaderboard,
    getLeaderboardRpc,
    joinRoomRpc,
    matchInit,
    matchJoin,
    matchJoinAttempt,
    matchLeave,
    matchLoop,
    matchSignal,
    matchTerminate,
} from './match_handler';

function matchmakerMatched(
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    matches: nkruntime.MatchmakerResult[],
): string {
    logger.info('Matchmaker matched. Creating match...');

    const mode = matches[0]?.properties?.mode === 'timed' ? 'timed' : 'classic';
    return nk.matchCreate('tictactoe', { kind: 'matchmaking', mode });
}

function InitModule(
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    initializer: nkruntime.Initializer,
): void {
    logger.info('TIC-TAC-TOE VERSION: FORCE_RELOAD_006');
    logger.info('Registering Tic-Tac-Toe Match Handler...');
    ensureGlobalRankingLeaderboard(logger, nk);

    initializer.registerMatch('tictactoe', {
        matchInit,
        matchJoinAttempt,
        matchJoin,
        matchLeave,
        matchLoop,
        matchTerminate,
        matchSignal,
    });

    initializer.registerRpc('create_room', createRoomRpc);
    initializer.registerRpc('join_room', joinRoomRpc);
    initializer.registerRpc('get_leaderboard', getLeaderboardRpc);
    initializer.registerMatchmakerMatched(matchmakerMatched);

    logger.info('Tic-Tac-Toe Match Handler, Room RPCs, Leaderboard RPC, and Matchmaker Hook Registered!');
}

// @ts-ignore
globalThis['InitModule'] = InitModule;
