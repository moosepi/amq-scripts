// ==UserScript==
// @name         amq song history (with localStorage) (moosepi fork)
// @namespace    http://tampermonkey.net/
// @version      1.53
// @description  Display Song history in the song info box, including the guess rate and time since last time the song played.
// @author       Minigamer42
// @match        https://animemusicquiz.com/*
// @downloadURL  https://github.com/moosepi/amq-scripts/raw/main/song-history/amq%20song%20history%20(with%20localStorage).user.js
// @updateURL    https://github.com/moosepi/amq-scripts/raw/main/song-history/amq%20song%20history%20(with%20localStorage).user.js
// @grant        none
// @require      https://github.com/joske2865/AMQ-Scripts/raw/master/common/amqScriptInfo.js
// @require      https://github.com/Minigamer42/scripts/raw/master/lib/commands.js
// ==/UserScript==

const infoDiv = document.createElement('div');
infoDiv.className = "rowPlayCount";

if (window.quiz) {
    setup();
}

function setup() {
    function timeAgo(time) {
        if (time === 0) {
            return 'never';
        }
        switch (typeof time) {
            case 'number':
                break;
            case 'string':
                time = +new Date(time);
                break;
            case 'object':
                if (time.constructor === Date) time = time.getTime();
                break;
            default:
                time = +new Date();
        }
        const time_formats = [
            [60, 'seconds', 1], // 60
            [120, '1 minute ago', '1 minute from now'], // 60*2
            [3600, 'minutes', 60], // 60*60, 60
            [7200, '1 hour ago', '1 hour from now'], // 60*60*2
            [86400, 'hours', 3600], // 60*60*24, 60*60
            [172800, 'Yesterday', 'Tomorrow'], // 60*60*24*2
            [604800, 'days', 86400], // 60*60*24*7, 60*60*24
            [1209600, 'Last week', 'Next week'], // 60*60*24*7*4*2
            [2419200, 'weeks', 604800], // 60*60*24*7*4, 60*60*24*7
            [4838400, 'Last month', 'Next month'], // 60*60*24*7*4*2
            [29030400, 'months', 2419200], // 60*60*24*7*4*12, 60*60*24*7*4
            [58060800, 'Last year', 'Next year'], // 60*60*24*7*4*12*2
            [2903040000, 'years', 29030400], // 60*60*24*7*4*12*100, 60*60*24*7*4*12
            [5806080000, 'Last century', 'Next century'], // 60*60*24*7*4*12*100*2
            [58060800000, 'centuries', 2903040000] // 60*60*24*7*4*12*100*20, 60*60*24*7*4*12*100
        ];
        let seconds = (+new Date() - time) / 1000,
            token = 'ago',
            list_choice = 1;

        if (seconds === 0) {
            return 'Just now';
        }
        if (seconds < 0) {
            seconds = Math.abs(seconds);
            token = 'from now';
            list_choice = 2;
        }
        let i = 0, format;
        while (format = time_formats[i++]) {
            if (seconds < format[0]) {
                if (typeof format[2] == 'string') {
                    return format[list_choice];
                } else {
                    return Math.floor(seconds / format[2]) + ' ' + format[1] + ' ' + token;
                }
            }
        }
        return time;
    }

    let boxDiv = document.querySelector('div.qpSideContainer > div.row').parentElement;
    boxDiv.insertBefore(infoDiv, boxDiv.children[4]);

    if (!localStorage.getItem('cslSongHistory')) {
        localStorage.setItem('cslSongHistory', '{}');
    }
    if (!localStorage.getItem('songHistory')) {
        localStorage.setItem('songHistory', '{}');
    }
    const l = new Listener("answer results");
    l.callback = async (data) => {
		if (quiz.teamMode) {
			const playerTeam = quiz.players[quiz.ownGamePlayerId].teamNumber
			for (let player of Object.values(quiz.players)) {
			if (playerTeam == player.teamNumber && player.gamePlayerId != quiz.ownGamePlayerId) {
				infoDiv.innerHTML = '';
				return;
				}
			}
		}
        const webm = data.songInfo.videoTargetMap?.catbox?.[720]?.slice(0, 6) ?? data.songInfo.videoTargetMap?.catbox?.[480]?.slice(0, 6);
        if (!webm) {
            infoDiv.innerHTML = '';
            return;
        }

        const historyKey = "songHistory";
        const songHistory = JSON.parse(localStorage.getItem(historyKey));
        const current = songHistory[webm] ?? {count: 0, correctCount: 0, lastPlayed: 0, lastFive: [false, false, false, false, false]};
        if (!current.lastFive) {
            //const lastFiveMaxWrong = Math.min(current.count - current.correctCount, 5);
            current.lastFive = [false, false, false, false, false];
            //for (var i = 0; i < Math.min(5, current.count) - lastFiveMaxWrong; i++) {
            //    current.lastFive.push(true);
            //    current.lastFive.shift();
            //}
        }
        let isCorrect;
        if (quiz.gameMode === "Nexus") {
            isCorrect = data.players[0]?.correct;
        } else {
            isCorrect = quiz.isSpectator ? false : data.players.find(player => player.gamePlayerId === quiz.ownGamePlayerId)?.correct;
        }

        if (!quiz.isSpectator) {
            current.lastFive.push(isCorrect);
            current.lastFive.shift();
            current.count++;
            current.correctCount += isCorrect;
            if (current.correctCount > current.count) {current.correctCount = current.count;}
            localStorage.setItem(historyKey, JSON.stringify({
                ...songHistory,
                [webm]: {
                    count: current.count,
                    correctCount: current.correctCount,
                    lastPlayed: Date.now(),
                    lastFive: current.lastFive
                }
            }));
        }

        if (current.count === 0) {
            infoDiv.innerHTML = '';
            return;
        }

        let s = current.count > 1 ? "s" : "";
        let correctRatio = current.correctCount / current.count;
        let lastFiveCorrect = Math.min(current.lastFive.filter(x => x).length, current.count);
		let lastFiveSquares = current.lastFive.map((correct) => correct ? "🟩" : "🟥").join("");
        infoDiv.innerHTML = `Played <b>${current.count} time${s}</b>`;
        infoDiv.innerHTML += `<br>Correct rate: <b>${current.correctCount}/${current.count}</b> (${(correctRatio * 100).toFixed(2)}%)`;
        //infoDiv.innerHTML += `<br>Last five: <b>${lastFiveCorrect}/${Math.min(current.count, 5)}</b>`;
        infoDiv.innerHTML += `<br>Last five: <b>${lastFiveSquares}</b>`;
        infoDiv.innerHTML += `<br>Last played <b>${timeAgo(current.lastPlayed)}</b>`;
    };
    l.bindListener();

    /**
     * @param limit {string}
     * @param start {string}
     */
    function displaySongHistory(limit = '10', start = '1') {
        const historyKey = "songHistory";
        const songsPlayed = [];
        const songs = JSON.parse(localStorage[historyKey]);

        for (const url in songs) {
            songs[url]['url'] = url;
            songsPlayed.push(songs[url]);
        }
        songsPlayed.sort((songA, songB) => songB.count - songA.count);
        if (songsPlayed.count < limit) {
            limit = `${songsPlayed.count}`;
        }
        if (start <= 0) {
            start = '1';
        }

        gameChat.systemMessage(`List of songs played (${start} - ${parseInt(limit) + parseInt(start) - 1}):`);
        for (let i = parseInt(start) - 1; i < parseInt(limit) + parseInt(start) - 1; i++) {
            /** @type {{count: number, correctCount: number, lastPlayed: number, url: string}} */
            const song = songsPlayed[i];
            gameChat.systemMessage(`<a href='https://files.catbox.moe/${song.url}.webm' target='_blank'>https://files.catbox.moe/${song.url}.webm</a>: ${song.count} (${song.correctCount}/${song.count})`);
        }
    }


    AMQ_addScriptData({
        name: "Song History",
        author: "Minigamer42",
        description: `<p>-- Browser Mode --<p>
    <p>Display the number of time a song played before and your guess rate on it in the song info window</p>
            <p><a href="https://github.com/Minigamer42/scripts/raw/master/src/amq%20song%20history%20(with%20localStorage).user.js" target="_blank">Click this link</a> to update it.</p>`
    });

    AMQ_addCommand({
        command: 'songhistory',
        callback: displaySongHistory,
        description: 'Display song history ordered by count descending. Parameters default to 10 and 1'
    });
}
