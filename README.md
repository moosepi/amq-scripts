# AMQ Scripts

Assorted userscripts for AMQ -- will probably mostly be personalised forks that change the functionality of the original in some significant way (but are better for my purposes).

## AMQ Song History

Forked from [Minigamer's](https://github.com/Minigamer42/scripts/blob/master/src/amq%20song%20history%20(with%20localStorage).user.js). Main changes are removing spec count (personally pref not to track) and including a counter that tracks last 5 answers specifically so you can see what you've actually unlearned. Should be backwards compatible so you don't lose song history if you decide to move to this one but you may have issues if you move back (ping me if you have issues either way).

## AMQ Better Song Artist

Forked from [4Lajf's](https://github.com/4Lajf/amq-scripts/blob/main/amqBetterSongArtist.user.js). s/a mode with dropdown.

Changes:

- disabled non-strict mode for now since it was buggy from testing 
  - also removed the population of dropdown with the split artist titles since they'd now just be clutter
- assorted bugfixes

Known issues:

- overly long artist names hit chatbox limit, prob have to hash these
- issues on reconnect
- issues when attempting to disable while loading a lobby
- some browsers can't navigate between the boxes with tab?
  - (personally) have had no issue with Firefox
- can't scroll dd with wheel?

TODO (nice to have):

- reimplement non-strict mode (with proper artist->group mapping)
  - allow reordered combinations of the same artist even in strict mode 
- integrate with song history 
- NGMC support? 