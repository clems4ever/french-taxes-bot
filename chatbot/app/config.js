/*
The MIT License (MIT)
Copyright (c) 2016 - Clement Michaud, Sergei Kireev

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

var path = require('path');

var configDirectory = path.resolve(__dirname, '..', 'config');

module.exports = {
    'general': require(path.resolve(configDirectory, 'general.json')),
    'selection': require(path.resolve(configDirectory, 'selection.json')),
    'loggers': {
        'selection': require(path.resolve(configDirectory, 'loggers', 'selection.json')),
        'elasticsearch': require(path.resolve(configDirectory, 'loggers', 'elasticsearch.json'))
    },
    'kik': require(path.resolve(configDirectory, 'kik/default.json')),
    'messenger': require(path.resolve(configDirectory, 'messenger/default.json')),
    'skype': require(path.resolve(configDirectory, 'skype/default.json')),
    'slack': require(path.resolve(configDirectory, 'slack/default.json')),
    'telegram': require(path.resolve(configDirectory, 'telegram/default.json'))
};
