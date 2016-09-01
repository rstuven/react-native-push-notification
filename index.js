/**
 * @providesModule Notifications
 */

'use strict';

var RNNotificationsComponent = require( './component' );

var AppState = RNNotificationsComponent.state;
var RNNotifications = RNNotificationsComponent.component;

var Platform = require('react-native').Platform;

var Notifications = {
	handler: RNNotifications,
	onRegister: false,
	onError: false,
	onNotification: false,

	isLoaded: false,

	isPermissionsRequestPending: false,

	permissions: {
		alert: true,
		badge: true,
		sound: true
	}
};

Notifications.callNative = function(name: String, params: Array) {
	if ( typeof this.handler[name] === 'function' ) {
		if ( typeof params !== 'array' &&
			 typeof params !== 'object' ) {
			params = [];
		}

		return this.handler[name](...params);
	} else {
		return null;
	}
};

/**
 * Configure local and remote notifications
 * @param {Object}		options
 * @param {function}	options.onRegister - Fired when the user registers for remote notifications.
 * @param {function}	options.onNotification - Fired when a remote notification is received.
 * @param {function} 	options.onError - None
 * @param {Object}		options.permissions - Permissions list
 * @param {Boolean}		options.requestPermissions - Check permissions when register
 */
Notifications.configure = function(options: Object) {
	if ( typeof options.onRegister !== 'undefined' ) {
		this.onRegister = options.onRegister;
	}

	if ( typeof options.onError !== 'undefined' ) {
		this.onError = options.onError;
	}

	if ( typeof options.onNotification !== 'undefined' ) {
		this.onNotification = options.onNotification;
	}

	if ( typeof options.permissions !== 'undefined' ) {
		this.permissions = options.permissions;
	}

	if ( typeof options.senderID !== 'undefined' ) {
		this.senderID = options.senderID;
	}

	if ( this.isLoaded === false ) {
		this._onRegister = this._onRegister.bind(this);
		this._onNotification = this._onNotification.bind(this);
		this.callNative( 'addEventListener', [ 'register', this._onRegister ] );
		this.callNative( 'addEventListener', [ 'notification', this._onNotification ] );

		if ( typeof options.popInitialNotification === 'undefined' ||
			 options.popInitialNotification === true ) {
			this.popInitialNotification(function(firstNotification) {
				if ( firstNotification !== null ) {
					this._onNotification(firstNotification, true);
				}
			}.bind(this));
		}

		this.isLoaded = true;
	}

	if ( options.requestPermissions !== false ) {
		this._requestPermissions();
	}

};

/* Unregister */
Notifications.unregister = function() {
	this.callNative( 'removeEventListener', [ 'register', this._onRegister ] )
	this.callNative( 'removeEventListener', [ 'notification', this._onNotification ] )
};

/* Internal Functions */
Notifications._onRegister = function(token: String) {
	if ( this.onRegister !== false ) {
		this.onRegister({
			token: token,
			os: Platform.OS
		});
	}
};

Notifications._onNotification = function(data, isFromBackground = null) {
	if ( isFromBackground === null ) {
		isFromBackground = (
			data.foreground === false ||
			AppState.currentState === 'background'
		);
	}

	if ( this.onNotification !== false ) {
		if ( Platform.OS === 'ios' ) {
			this.onNotification({
				foreground: ! isFromBackground,
				userInteraction: isFromBackground,
				message: data.getMessage(),
				data: data.getData(),
				badge: data.getBadgeCount(),
				alert: data.getAlert(),
				sound: data.getSound()
			});
		} else {
			var notificationData = {
				foreground: ! isFromBackground,
				...data
			};

			if ( typeof notificationData.data === 'string' ) {
				try {
					notificationData.data = JSON.parse(notificationData.data);
				} catch(e) {
					/* void */
				}
			}

			this.onNotification(notificationData);
		}
	}
};

/* onResultPermissionResult */
Notifications._onPermissionResult = function() {
	this.isPermissionsRequestPending = false;
};

// Prevent requestPermissions called twice if ios result is pending
Notifications._requestPermissions = function() {
	if ( Platform.OS === 'ios' ) {
		if ( this.isPermissionsRequestPending === false ) {
			this.isPermissionsRequestPending = true;
			return this.callNative( 'requestPermissions', [ this.permissions ])
							.then(this._onPermissionResult.bind(this))
							.catch(this._onPermissionResult.bind(this));
		}
	} else if ( typeof this.senderID !== 'undefined' ) {
		return this.callNative( 'requestPermissions', [ this.senderID ]);
	}
};

// Stock requestPermissions function
Notifications.requestPermissions = function() {
	if ( Platform.OS === 'ios' ) {
		return this.callNative( 'requestPermissions', [ this.permissions ]);
	} else if ( typeof this.senderID !== 'undefined' ) {
		return this.callNative( 'requestPermissions', [ this.senderID ]);
	}
};

/* Fallback functions */

Notifications.setApplicationIconBadgeNumber = function() {
	return this.callNative('setApplicationIconBadgeNumber', arguments);
};

Notifications.getApplicationIconBadgeNumber = function() {
	return this.callNative('getApplicationIconBadgeNumber', arguments);
};

Notifications.popInitialNotification = function(handler) {
	this.callNative('getInitialNotification').then(function(result){
		handler(result);
	});
};

Notifications.abandonPermissions = function() {
	return this.callNative('abandonPermissions', arguments);
};

Notifications.checkPermissions = function() {
	return this.callNative('checkPermissions', arguments);
};

module.exports = Notifications;
