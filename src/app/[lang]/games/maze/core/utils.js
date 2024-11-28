
export function forEachContiguousPair(array, fn) {
    "use strict";
    console.assert(array.length >= 2);
    for (let i=0; i<array.length-1; i++) {
        fn(array[i], array[i+1]);
    }
}

export function buildEventTarget(name) {
    "use strict";
    const eventTarget = new EventTarget(),
        handlers = [];

    return {
        trigger(eventName, eventData) {
            const event = new Event(eventName);
            event.data = eventData;
            eventTarget.dispatchEvent(event);
            // console.log('EVENT', name, eventName, eventData);
        },
        on(eventName, handler) {
            const eventHandler = event => handler(event.data);
            handlers.push({eventName, eventHandler});
            eventTarget.addEventListener(eventName, eventHandler);
        },
        off(eventNameToRemove) {
            let i = handlers.length;
            while (i--) {
                const {eventName, eventHandler} = handlers[i];
                if (!eventNameToRemove || eventName === eventNameToRemove) {
                    eventTarget.removeEventListener(eventName, eventHandler);
                    handlers.splice(i, 1);
                }
            }
        }
    };
}
