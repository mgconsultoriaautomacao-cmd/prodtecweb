"use strict";

var QWebChannelMessageTypes = {
    signal: 1,
    propertyUpdate: 2,
    init: 3,
    idle: 4,
    debug: 5,
    invokeMethod: 6,
    connectToSignal: 7,
    disconnectFromSignal: 8,
    setProperty: 9,
    response: 10
};

var QWebChannel = function(transport, initCallback) {
    if (typeof transport !== "object" || typeof transport.send !== "function") {
        console.error("The QWebChannel requires a transport object. Alternatively, provide a callback to be called when the transport becomes available.");
        return;
    }

    var channel = this;
    this.transport = transport;

    this.send = function(data) {
        if (typeof(data) !== "string") {
            data = JSON.stringify(data);
        }
        channel.transport.send(data);
    };

    this.transport.onmessage = function(message) {
        var data = message.data;
        if (typeof data === "string") {
            data = JSON.parse(data);
        }
        switch (data.type) {
            case QWebChannelMessageTypes.signal:
                channel.handleSignal(data);
                break;
            case QWebChannelMessageTypes.response:
                channel.handleResponse(data);
                break;
            case QWebChannelMessageTypes.propertyUpdate:
                channel.handlePropertyUpdate(data);
                break;
            default:
                console.error("invalid message received:", message.data);
                break;
        }
    };

    this.execCallbacks = {};
    this.execId = 0;
    this.exec = function(data, callback) {
        if (!callback) {
            channel.send(data);
            return;
        }
        if (channel.execId === Number.MAX_VALUE) {
            channel.execId = Number.MIN_VALUE;
        }
        if (data.hasOwnProperty("id")) {
            console.error("Cannot exec message with id already set: " + JSON.stringify(data));
            return;
        }
        data.id = ++channel.execId;
        channel.execCallbacks[data.id] = callback;
        channel.send(data);
    };

    this.objects = {};

    this.handleSignal = function(message) {
        var object = channel.objects[message.object];
        if (object) {
            object.signalEmitted(message.signal, message.args);
        } else {
            console.warn("Unhandled signal: " + message.object + "::" + message.signal);
        }
    };

    this.handleResponse = function(message) {
        if (!message.hasOwnProperty("id")) {
            console.error("Invalid response message received: ", JSON.stringify(message));
            return;
        }
        var cb = channel.execCallbacks[message.id];
        delete channel.execCallbacks[message.id];
        if (cb) {
            cb(message.data);
        }
    };

    this.handlePropertyUpdate = function(message) {
        for (var i = 0; i < message.data.length; ++i) {
            var data = message.data[i];
            var object = channel.objects[data.object];
            if (object) {
                object.propertyUpdate(data.signals, data.properties);
            } else {
                console.warn("Unhandled property update: " + data.object);
            }
        }
        channel.exec({type: QWebChannelMessageTypes.idle});
    };

    this.debug = function(message) {
        channel.send({type: QWebChannelMessageTypes.debug, data: message});
    };

    channel.exec({type: QWebChannelMessageTypes.init}, function(data) {
        for (var objectName in data) {
            var object = new QObject(objectName, data[objectName], channel);
        }
        // now unwrap properties, which might be objects as well
        for (var objectName in channel.objects) {
            channel.objects[objectName].unwrapProperties();
        }
        if (initCallback) {
            initCallback(channel);
        }
    });
};

function QObject(name, data, webChannel) {
    this.__id__ = name;
    webChannel.objects[name] = this;

    // List of properties that are objects themselves
    this.__objectPropertyNames__ = [];

    var self = this;

    // ----------------------------------------------------------------------

    this.unwrapQObject = function(response) {
        if (response instanceof Array) {
            var ret = [];
            for (var i = 0; i < response.length; ++i) {
                ret.push(self.unwrapQObject(response[i]));
            }
            return ret;
        }
        if (!response || !response["__id__"])
            return response;

        var objectId = response["__id__"];
        if (webChannel.objects[objectId])
            return webChannel.objects[objectId];

        if (!response.data) {
            console.error("Cannot unwrap unknown QObject " + objectId + " without data.");
            return;
        }

        var qObject = new QObject( objectId, response.data, webChannel );
        qObject.unwrapProperties();
        return qObject;
    };

    this.unwrapProperties = function() {
        for (var i = 0; i < self.__objectPropertyNames__.length; ++i) {
            var propertyName = self.__objectPropertyNames__[i];
            self[propertyName] = self.unwrapQObject(self[propertyName]);
        }
    };

    function addSignal(signalData, isProperty) {
        var signalName = signalData[0];
        var signalIndex = signalData[1];
        self[signalName] = {
            connect: function(callback) {
                if (typeof(callback) !== "function") {
                    console.error("Bad callback given to connect to signal " + signalName);
                    return;
                }
                self.__objectSignals__[signalIndex] = self.__objectSignals__[signalIndex] || [];
                self.__objectSignals__[signalIndex].push(callback);
                if (!isProperty && self.__objectSignals__[signalIndex].length === 1) {
                    webChannel.exec({
                        type: QWebChannelMessageTypes.connectToSignal,
                        object: self.__id__,
                        signal: signalIndex
                    });
                }
            },
            disconnect: function(callback) {
                if (typeof(callback) !== "function") {
                    console.error("Bad callback given to disconnect from signal " + signalName);
                    return;
                }
                var callbacks = self.__objectSignals__[signalIndex] || [];
                var idx = callbacks.indexOf(callback);
                if (idx === -1) {
                    console.error("Cannot find such callback connected to signal " + signalName);
                    return;
                }
                callbacks.splice(idx, 1);
                if (!isProperty && callbacks.length === 0) {
                    webChannel.exec({
                        type: QWebChannelMessageTypes.disconnectFromSignal,
                        object: self.__id__,
                        signal: signalIndex
                    });
                }
            }
        };
    }

    function addMethod(methodData) {
        var methodName = methodData[0];
        var methodIndex = methodData[1];
        self[methodName] = function() {
            var args = [];
            var callback;
            for (var i = 0; i < arguments.length; ++i) {
                if (typeof arguments[i] === "function" && i === (arguments.length - 1)) {
                    callback = arguments[i];
                } else {
                    args.push(arguments[i]);
                }
            }

            webChannel.exec({
                type: QWebChannelMessageTypes.invokeMethod,
                object: self.__id__,
                method: methodIndex,
                args: args
            }, function(response) {
                if (response !== undefined) {
                    var result = self.unwrapQObject(response);
                    if (callback) {
                        callback(result);
                    }
                }
            });
        };
    }

    function bindGetterSetter(propertyInfo) {
        var propertyIndex = propertyInfo[0];
        var propertyName = propertyInfo[1];
        var notifySignalData = propertyInfo[2];
        // initialize property cache with current value
        // Note: Property data is stored at index = propertyIndex + 1 in data.properties
        self[propertyName] = propertyInfo[3];

        if (notifySignalData) {
            addSignal(notifySignalData, true);
        }

        Object.defineProperty(self, propertyName, {
            configurable: true,
            get: function () {
                return self.__propertyCache__[propertyIndex];
            },
            set: function (value) {
                if (value === undefined) {
                    console.warn("Property setter for " + propertyName + " called with undefined value!");
                    return;
                }
                self.__propertyCache__[propertyIndex] = value;
                webChannel.exec({
                    type: QWebChannelMessageTypes.setProperty,
                    object: self.__id__,
                    property: propertyIndex,
                    value: value
                });
            }
        });
    }

    // ----------------------------------------------------------------------

    this.__propertyCache__ = {};
    this.__objectSignals__ = {};

    var i;
    for (i = 0; i < data.methods.length; ++i) {
        addMethod(data.methods[i]);
    }

    for (i = 0; i < data.signals.length; ++i) {
        addSignal(data.signals[i], false);
    }

    for (i = 0; i < data.properties.length; ++i) {
        bindGetterSetter(data.properties[i]);
    }
}

QObject.prototype.signalEmitted = function(signalIndex, signalArgs) {
    var callbacks = this.__objectSignals__[signalIndex];
    if (callbacks) {
        for (var i = 0; i < callbacks.length; ++i) {
            callbacks[i].apply(this, signalArgs);
        }
    }
};

QObject.prototype.propertyUpdate = function(signals, properties) {
    for (var signalIndex in signals) {
        var signalArgs = signals[signalIndex];
        this.signalEmitted(signalIndex, signalArgs);
    }
    for (var propertyIndex in properties) {
        var propertyValue = properties[propertyIndex];
        this.__propertyCache__[propertyIndex] = propertyValue;
    }
};

if (typeof module !== 'undefined') {
    module.exports = {
        QWebChannel: QWebChannel
    };
}
