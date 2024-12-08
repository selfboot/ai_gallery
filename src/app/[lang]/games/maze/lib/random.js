export function buildRandom(seed=Date.now()) {
    // https://stackoverflow.com/a/47593316/138256
    function mulberry32() {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }

    return {
        rnd: mulberry32,
        range(num1, num2) {
            const [min,max] = [num1, num2].sort();
            return Math.floor(min + (max-min+1) * mulberry32());
        },
        int(rangeSize) {
            "use strict";
            console.assert(rangeSize>0);
            return this.range(0, rangeSize-1);
        },
        choice(array) {
            const length = array.length;
            if (length) {
                return array[this.int(length)];
            }
        },
        shuffle(array) {
            let i = array.length;

            while (i) {
                const r = this.int(i--);
                [array[i], array[r]] = [array[r], array[i]];
            }

            return array;
        },
        get seed() {
            return seed;
        }
    };
}
