import * as mime from 'mime-types';

console.log('audio/ogg ->', mime.extension('audio/ogg'));
console.log('audio/ogg; codecs=opus ->', mime.extension('audio/ogg; codecs=opus'));
