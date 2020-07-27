const CHANGELOG = {
    'v3.669': [
        'You can now enable/disable lazy loading permanently in Files tab.',
        'Fixed filter not working with custom expressions.',
        'Fixed filter not working with custom sessions within Me tab.',
        'Added info pupup to filter with all available options.'
    ],
    'v3.649': [
        'Added experimental lazy loading that can be enabled by using the following url: <a href="https://sftools.mar21.eu/stats?lazy">https://sftools.mar21.eu/stats?lazy</a>'
    ],
    'v3.630': [
        'Fixed a bug that caused settings to be invisible / froze the tool.',
        'Added <code>const</code> keyword that allows you to set your own constants.',
        'Keyword <code>show as</code> can now also be used in Me tab.',
        'You can now separate stored data into different slots via url <code>https://sftools.mar21.eu/stats?slot=1</code>.<br/>The default slot number is 0 and it can be any positive number.<br/>Please note that they share settings and any changes will affect all other slots.'
    ],
    'v3.616': [
        '<code>Last Active</code> header no longer works as before.<br/>To use colors like before, you\'ll need to modify the header in this way:<br/><br/><img src="res/update0.png" style="margin-left: -2em;"></img>'
    ],
    'v3.610': [
        'Migrated <code>Album</code>, <code>Mount</code> and few other headers over to the new header system.',
        'Removed <code>percentage</code> option. <code>Mount</code> and <code>Album</code> are now always in percent. Use <code>Album Items</code> to get amount of items in the album.',
        'Added <code>decimal</code> option that decides whether statistics should be rounded or not.',
        'Added <code>clean hard</code> option that strips everything except expression from the header.',
        'Added <code>rgb</code>, <code>rgba</code> and <code>range</code> functions.',
        '<code>Last Active</code> now only shows last active time. For inactive duration use <code>Inactive Time</code>.',
        'Added several predefined enums.'
    ],
    'v3.606': [
        'Reworked dot object access.',
        'Some unary operators can now be stacked infinitely.'
    ],
    'v3.594': [
        'You can now use header names with <code>player</code> and <code>reference</code> objects as arguments.<br/>You can look at an example <a href="https://pastebin.com/raw/5MVYXF2n">here</a>.',
        'Option <code>clean</code> no longer requires you to disable invisibility.',
        'Fixed incorrect sorting on several headers.'
    ],
    'v3.589': [
        'Templates are now available also in temporary sessions.',
        'Added headers for item base attributes and pet bonus percentages.',
        'Added <code>round</code> and <code>fixed</code> functions for custom expressions.',
        'Fixed own raidable wood and stone.'
    ],
    'v3.575': [
        'Weapon damage and elemental damage runes are now shown properly for Assassins within the detail screen.',
        'Added headers for weapon damage and separated elemental damage headers.'
    ],
    'v3.559': [
        'Added <code>clean</code> keyword that forces header to ignore all shared options.<br/>You can look at an example <a href="https://pastebin.com/raw/WaFSAsRc">here</a>.'
    ],
    'v3.551': [
        'You are now required to use <code>player</code> object to access player data.<br/>You can look at an example <a href="https://pastebin.com/raw/mZmT0hh8">here</a>.'
    ],
    'v3.549': [
        'Added ability to sort columns by anything using <code>order by</code> keyword including <code>difference</code> variable to sort by difference.',
        'Added way to access compared object with <code>reference</code> variable.'
    ]
};
