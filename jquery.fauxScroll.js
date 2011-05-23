/*!
 * jQuery Faux Scroll Plugin.
 * https://github.com/jvduf
 *
 * Copyright 2011 Jeroen van Duffelen (@jvduf)
 * Released under MIT license.
 * http://www.opensource.org/licenses/mit-license.php
 *
 * Inspired by iScroll by Matteo Spinelli - http://cubiq.org
 *
 *
 * KNOWN BUGS:
 * - Height of the scrollEl does not include the margins of the
 *   elements inside it. So sometimes content on the bottom falls of the
 *   screen.
 * - If the content inside the el is wider than el itself, the width of the
 *   child elements does not widen the el - probably because of the overflow
 *   hidden declaration.
 * - The native scrollbar width is not added to the maxScroll values.
 * - Scroll runtime on native scrolling animation doesn't work.
 * - nativeScrollRepeater only supports scrolling over the Y ax.
 *
 * TODO:
 * - Add scrollbars on fauxScroll.
 * - The bounce back of the fauxScroll is always 350ms. The timing should be
 *   set relative to distance it has to bounce back. Calculate this in
 *   resetDestination().
 */


 (function($) {


    jQuery.fn.fauxScroll = function(call) {
        var me = this,
        support = me.data('support'),
        settings = me.data('settings'),
        state = me.data('state');


        /* ---------------------------------------------------------------- */


        var methods = {
            initialize: initialize,
            destroy: destroy,
            enable: enable,
            disable: disable,
            isAnimating: isAnimating,
            isEnabled: isEnabled,
            isScrolling: isScrolling,
            isWithinBounds: isScrollPositionWithinBounds,
            isOutOfBounds: isScrollPositionOutOfBounds,
            maxScroll: getMaxScroll,
            scrollTop: getScrollTop,
            scrollLeft: getScrollLeft,
            refresh: refresh,
            scrollTo: scrollTo,
            state: getState,
            stopAnimation: stopAnimation
        };


        /* ---------------------------------------------------------------- */


        if (methods[call]) {
            if (state && state.initialized) {
                return methods[call].apply(me, Array.prototype.slice.call(arguments, 1));
            } else {
                return me;
            };
        } else if (typeof call === 'object' || !call) {
            return initialize.apply(me, arguments);
        };


        /* ---------------------------------------------------------------- */


        function initialize(options) {

            // If the jQuery selection does not return any elements, if it returns
            // more than 1 element or if fauxScroll has already been initialized,
            // meaning state is true-ish, return me to cancel.
            if (me.length === 0 || !me.length || me.length > 1 || state) {
                if (me.length && me.length > 1) throw 'jQuery fauxScroll can only be applied to one element at a time.';
                return me;
            };

            var has3d = ('WebKitCSSMatrix' in window && 'm11' in new WebKitCSSMatrix()),    // Checks if the browser supports the CSS3 translate3d declaration.
            hasTouch = ('ontouchstart' in window);                                          // Checks if the browser supports touch events.

            me.data('support', {
                has3d: has3d,
                hasTouch: hasTouch,
                isIOS: (/iphone|ipad/gi).test(navigator.appVersion),        // Checks if the device is an iOS device.
                INPUT_START_EVENT: hasTouch ? 'touchstart': 'mousedown',    // Normalizes touch and mouse input events.
                INPUT_MOVE_EVENT: hasTouch ? 'touchmove': 'mousemove',      // Normalizes touch and mouse input events.
                INPUT_END_EVENT: hasTouch ? 'touchend': 'mouseup',          // Normalizes touch and mouse input events.
                translateOpen: 'translate' + (has3d ? '3d(': '('),          // Predefined string for setting the CSS3 translate(3d) declaration.
                translateClose: has3d ? ',0)': ')'                          // Predefined string for setting the CSS3 translate(3d) declaration.
            });
            support = me.data('support');

            me.data('settings', {
                bounce: support.has3d,                                  // Enable the scrollEl to bounce and be dragged past wrapperEl's bounds.
                checkDOMChanges: true,                                  // Enable listening to DOM changes in the el to call the refresh method.
                desktopCompatibility: false,                            // Replace the native scrolling with fauxScroll.
                fadeScrollbar: support.isIOS || !support.hasTouch,      // Enable fading of the fauxScroll scrollbars after a manual or animated scroll.
                forceNativeScroll: false,                               // Force fauxScroll to use native scrolling on mobile devices.
                horizontalScrollbar: support.has3d,                     // Enable the horizontal scrollbar.
                horizontalScroll: true,                                 // Enable horizontal scrolling.
                verticalScrollbar: support.has3d,                       // Enable the vertical scrollbar.
                verticalScroll: true,                                   // Enable vertical scrolling.
                momentum: support.has3d,                                // Enable momentum scroll.
                scrollEventIntervalDelay: 25,                           // Interval between the fauxScroll scroll events that get triggered during an animated scroll.
                shrinkScrollbar: support.isIOS                          // Enable the scrollbar shrinking effect.
            });
            settings = me.data('settings');

            me.data('state', {
                destination: {x: 0, y: 0},                              // The position of the scrollEl when the user is manually scrolling OR when the scrollEl is animating this reflects the end position where the scrollEl is scrolling to.
                dimensions: null,                                       // Dimensions for fauxScroll to function correctly.
                direction: {x: 0, y: 0},                                // The direction the scrollEl is being dragged or animated to.
                distance: {x: 0, y: 0},                                 // The distance traveled in one swipe.
                enabled: false,                                         // When this equals true the user is able to scroll, if this equals false the user can not.
                fauxScrollEventInterval: null,                          // Reference to the interval that triggers the onFauxScroll method.
                initialized: false,                                     // When this equals true fauxScroll is initialized and setup.
                inputStart: {x: 0, y: 0},                               // Reflects the x and y screen positions where the input started.
                moved: false,                                           // When this equals true the scrollEl is moved by the user or by an animated scroll.
                nativeScrollAnimationInterval: null,                    // Reference to the interval that takes care of the animated native scroll.
                nativeScrollEndTimeOut: null,                           // Reference to the timeout that delays the triggering of the onNativeScrollEnd method.
                nativeScrollSpeed: 0,                                   // The amount of pixels the native animated scroll travels per cycle.
                scrollAnimating: false,                                 // The state of the animated scroll.
                scrollAxes: {x: false, y: false},                       // Reflects the active scroll axes.
                scrolling: false,                                       // When this equals true the user is dragging the scrollEl.
                scrollLeft: 0,                                          // The absolute left position of the scrollEl.
                scrollStart: {time: 0, x: 0, y: 0},                     // Reflects the time, x and y positions where the scroll input started relative to the scrollEl.
                scrollTop: 0                                            // The absolute top position of the scrollEl.
            });
            state = me.data('state');

            // Merge predefined settings and custom options.
            if (options) {
                $.extend(settings, options);
            };

            // Set this fauxScroll to enabled and initialized.
            state.enabled = true;
            state.initialized = true;

            // Define me.el, just for consistency with me.scrollEl and
            // me.wrapperEl.
            me.el = me;

            // Create the wrapperEl, apply the initial CSS and wrap it around
            // the el.
            var wrapperEl = $('<div class="faux-scroll-wrapper"></div>');
            wrapperEl.css('cssText', '' +
            'height: 100%;' +
            'max-height: 100%;' +
            'overflow-x: hidden;' +
            'overflow-y: hidden;' +
            'width: 100%;'
            );
            me.el.wrap(wrapperEl);

            // Create the scrollEl.
            var scrollEl = $('<div class="faux-scroll"></div>');

            // Apply initial CSS to the scrollEl if needed.
            if ((support.hasTouch || settings.desktopCompatibility) && !settings.forceNativeScroll) {
                scrollEl.css('cssText', '' +
                '-webkit-transition-property: -webkit-transform;' +
                '-webkit-transition-timing-function: cubic-bezier(0,0,0.25,1);' +
                '-webkit-transition-duration: 0;' +
                '-webkit-transform: ' + support.translateOpen + '0, 0' + support.translateClose + ';'
                );
            };

            // Wrap the scrollEl around the el.
            me.el.wrap(scrollEl);

            // Define the scrollEl and the wrapperEl attributes.
            me.scrollEl = me.el.parent();
            me.wrapperEl = me.scrollEl.parent();

            // Set the initial dimensions and the max scroll values.
            refresh();

            // Bind input events on the scrollEl or bind scroll events on the
            // wrapperEl depending on the settings and the device used.
            if ((support.hasTouch || settings.desktopCompatibility) && !settings.forceNativeScroll) {
                me.scrollEl.bind(support.INPUT_START_EVENT, inputStart);
                me.scrollEl.bind(support.INPUT_MOVE_EVENT, inputMove);
                me.scrollEl.bind(support.INPUT_END_EVENT, inputEnd);

                if (support.hasTouch) me.scrollEl.bind('touchcancel', inputEnd);

                // Bind the webkitTransitionEnd event which listens for
                // webkitTransitionEnd of the scrollEl. webkitTransitionEnd events
                // fire when 1) an animated scroll ends within bounds and 2) when
                // animated scroll ends outside the bounds of the wrapperEl AND it
                // fires for the second time after that when the scrollEl bounced back
                // within bounds of the wrapperEl.
                me.scrollEl.bind('webkitTransitionEnd', onFauxTransitionEnd);
            } else {
                me.wrapperEl.bind('scroll', onNativeScroll);
            };

            // Bind the DOMSubtreeModified event which listens for DOM changes
            // in the el.
            if (settings.checkDOMChanges) {
                me.el.bind('DOMSubtreeModified', onDOMModified);
            };

            return me;
        };


        /* ---------------------------------------------------------------- */


        function refresh(repeatedRefresh) {

            // Re-apply CSS to the wrapperEl if needed to correctly calculate the
            // el's width.
            if ((!support.hasTouch && !settings.desktopCompatibility) || settings.forceNativeScroll) {
                me.wrapperEl.css('cssText', '' +
                'height: 100%;' +
                'overflow-x: auto;' +
                'overflow-y: auto;' +
                'width: 100%;'
                );
            };

            // To be able to calculate the hight of the content first set the
            // height of the scrollEl to auto.
            me.scrollEl.css('height', 'auto');

            var destinationX = state.destination.x,
            destinationY = state.destination.y,
            resetX = destinationX,
            resetY = destinationY,
            scrollAxes = state.scrollAxes;

            // Calculate the dimensions of the wrapperEl and the el and set the
            // max scroll values of this fauxScroll.
            var wrapperElHeight = me.wrapperEl.height(),
            wrapperElWidth = me.wrapperEl.width(),
            elHeight = me.el.height(),
            elWidth = me.el.width(),
            maxScrollX = wrapperElWidth - elWidth,
            maxScrollY = wrapperElHeight - elHeight;

            // Set the "dimensions" state.
            state.dimensions = {
                wrapperElHeight: wrapperElHeight,
                wrapperElWidth: wrapperElWidth,
                elHeight: elHeight,
                elWidth: elWidth,
                maxScrollX: maxScrollX,
                maxScrollY: maxScrollY
            };

            // Reset values are used to reposition the scrollEl to the bottom or
            // the right. This might be needed if the wrapperEl has shrunk because
            // of a resize and the scrollEl has scrolled passed the bottom or the
            // right boundery.
            // Check if the x scroll ax is active, if returns true calculate the
            // resetX position for the scrollEl.
            if (scrollAxes && scrollAxes.x) {

                // Check if the scrollEl is smaller than the wrapperEl
                // (maxScrollX >= 0), if returns true resetX equals 0 to reset the
                // scrollEl to the left boundary.
                if (maxScrollX >= 0) {
                    resetX = 0;
                }

                // Check if the scrollEl scrolled past the right boundary, if returns
                // true resetX equals maxScrollX to reset the element to the right
                // boundary.
                else if (destinationX < maxScrollX) {
                    resetX = maxScrollX;
                };
            };

            // Check if the y scroll ax is active, if returns true calculate the
            // resetY position for the scrollEl.
            if (scrollAxes && scrollAxes.y) {

                // Check if the scrollEl is smaller than the wrapperEl
                // (maxScrollY >= 0), if returns true resetY equals 0 to reset the
                // scrollEl to the bottom boundary.
                if (maxScrollY >= 0) {
                    resetY = 0;
                }

                // Check if the scrollEl scrolled past the bottom boundary, if returns
                // true resetY equals maxScrollY to reset the element to the bottom
                // boundary.
                else if (destinationY < maxScrollY) {
                    resetY = maxScrollY;
                };
            };

            // If the reset values do not match the current destinations set the
            // destination and the scroll position of the scrollEl.
            if (resetX != destinationX || resetY != destinationY) {
                setTransitionTime(0);
                setDestination(resetX, resetY, true);
                setScrollPosition(resetX, resetY);
            };

            // Activate the scroll axes if the scrollEl is wider or higher than
            // the wrapperEl.
            state.scrollAxes = {
                x: elWidth >= wrapperElWidth && settings.horizontalScroll,
                y: elHeight >= wrapperElHeight && settings.verticalScroll
            };

            // Set the height of the scrollEl height to 100% to prevent a height
            // collaps that happens as a bug in browsers when we el is smaller
            // than the wrapperEl.
            if (!state.scrollAxes.y) {
                me.scrollEl.css('height', '100%');
            };

            // Refresh the scrollbars and correct maxScrollWidth and
            // maxScrollHeight for width or height changes after the scrollbars
            // have been activated.
            if ((support.hasTouch || settings.desktopCompatibility) && !settings.forceNativeScroll) {
                refreshFauxScrollBars();
            } else if (!repeatedRefresh && ((!support.hasTouch && !settings.desktopCompatibility) || settings.forceNativeScroll)) {
                refreshNativeScrollBars();

                wrapperElHeight = me.wrapperEl.height(),
                wrapperElWidth = me.wrapperEl.width(),
                elHeight = me.el.height(),
                elWidth = me.el.width(),
                maxScrollX = wrapperElWidth - elWidth,
                maxScrollY = wrapperElHeight - elHeight;

                // Correct maxScrollWidth and maxScrollHeight if needed.
                state.dimensions.maxScrollX = !state.scrollAxes.x ? 0: maxScrollX;
                state.dimensions.maxScrollY = !state.scrollAxes.y ? 0: maxScrollY;
            };

            return me;
        };


        function refreshFauxScrollBars() {};


        function refreshNativeScrollBars() {
            if (state.scrollAxes.x) {
                me.wrapperEl.css({
                    'overflow-x': 'auto'
                });
            } else {
                me.wrapperEl.css({
                    'overflow-x': 'hidden'
                });
            };
            if (state.scrollAxes.y) {
                me.wrapperEl.css({
                    'overflow-y': 'auto'
                });
            } else {
                me.wrapperEl.css({
                    'overflow-y': 'hidden'
                });
            };

            refresh(true);

            return me;
        };


        function destroy() {

            // Remove all events related to fauxScroll.
            if ((support.hasTouch || settings.desktopCompatibility) && !settings.forceNativeScroll) {
                me.scrollEl.unbind(support.INPUT_START_EVENT, inputStart);
                me.scrollEl.unbind(support.INPUT_MOVE_EVENT, inputMove);
                me.scrollEl.unbind(support.INPUT_END_EVENT, inputEnd);

                if (support.hasTouch) me.scrollEl.unbind('touchcancel', inputEnd);

                me.scrollEl.unbind('webkitTransitionEnd', onFauxTransitionEnd);
            } else {
                me.wrapperEl.unbind('scroll', onNativeScroll);
            };

            if (settings.checkDOMChanges) {
                me.el.unbind('DOMSubtreeModified', onDOMModified);
            };

            // Replace the wrapperEl with the el and automatically destroy the
            // previously created divs.
            me.wrapperEl.replaceWith(me.el);

            return me;
        };


        /* ---------------------------------------------------------------- */


        function getState(item) {
            if (item) {
                return state[item];
            } else {
                return state;
            };
        };


        function isAnimating() {
            return state.scrollAnimating;
        };


        function isEnabled() {
            return state.enabled;
        };


        function isScrolling() {
            return state.scrolling;
        };


        function isDestinationWithinBounds() {
            var destinationX = state.destination.x,
            destinationY = state.destination.y,
            maxScrollX = state.dimensions.maxScrollX,
            maxScrollY = state.dimensions.maxScrollY;

            if (
            (destinationX <= 0 && destinationX >= maxScrollX) &&
            (destinationY <= 0 && destinationY >= maxScrollY)
            ) {
                return true;
            } else {
                return false;
            };
        };


        function isDestinationOutOfBounds() {
            return ! isDestinationWithinBounds();
        }


        function isScrollPositionWithinBounds() {
            var scrollTop = state.scrollTop,
            scrollLeft = state.scrollLeft,
            maxScrollX = -state.dimensions.maxScrollX,
            maxScrollY = -state.dimensions.maxScrollY;

            if (
            (scrollTop >= 0 && scrollTop <= maxScrollY) &&
            (scrollLeft >= 0 && scrollLeft <= maxScrollX)
            ) {
                return true;
            } else {
                return false;
            };
        };


        function isScrollPositionOutOfBounds() {
            return ! isScrollPositionWithinBounds();
        };


        function enable() {
            state.enabled = true;
            return me;
        };


        function disable() {
            state.enabled = false;
            return me;
        };


        function getScrollTop() {
            return state.scrollTop;
        };


        function getScrollLeft() {
            return state.scrollLeft;
        };


        function getMaxScroll() {
            var dimensions = getState('dimensions');

            return {
                x: dimensions.maxScrollX,
                y: dimensions.maxScrollY
            };
        };


        /* ---------------------------------------------------------------- */


        function onDOMModified(e) {
            setTimeout(function() {
                refresh();
            },
            0);

            return me;
        };


        /* ---------------------------------------------------------------- */


        function onFauxScroll(x, y) {
            var matrix,
            posX,
            posY,
            manualScroll = (x || x == 0) && (y || y == 0);

            if (manualScroll) {
                posX = x,
                posY = y;
            } else {
                matrix = new WebKitCSSMatrix(window.getComputedStyle(me.scrollEl[0]).webkitTransform),
                posX = matrix.e,
                posY = matrix.f;
            };

            if (manualScroll) {
                setDestination(posX, posY);
                setScrollPosition(posX, posY);
            } else {
                setScrollPosition(posX, posY);
            };

            state.moved = true;

            var scrollEvent = $.Event('fauxscroll');
            scrollEvent.scrollTop = getScrollTop();
            scrollEvent.scrollLeft = getScrollLeft();

            // console.log('onFauxScroll: getScrollTop:' + getScrollTop() + ' | destinationY:' + state.destination.y + ' | move:' + state.moved + ' | isScrollPositionWithinBounds:' + isScrollPositionWithinBounds());
            me.trigger(scrollEvent);
        };


        function onFauxScrollEnd(type) {
            clearInterval(state.fauxScrollEventInterval);

            state.direction = {
                x: 0,
                y: 0
            };
            state.moved = false;
            state.scrollAnimating = false;

            var matrix = new WebKitCSSMatrix(window.getComputedStyle(me.scrollEl[0]).webkitTransform),
            posX = matrix.e,
            posY = matrix.f;

            setDestination(posX, posY);
            setScrollPosition(posX, posY);

            var scrollEndEvent = $.Event('fauxscroll:end');
            scrollEndEvent.scrollTop = getScrollTop();
            scrollEndEvent.scrollLeft = getScrollLeft();

            // console.log('onFauxScrollEnd: getScrollTop:' + getScrollTop() + ' | destinationY:' + state.destination.y + ' | move:' + state.moved + ' | isScrollPositionWithinBounds:' + isScrollPositionWithinBounds());
            me.trigger(scrollEndEvent);
        };


        function onFauxTransitionEnd() {

            // Check if the TransitionEnd is within bounds, if returns true call
            // the onFauxScrollEnd function.
            if (isDestinationWithinBounds()) {

                // Check if the user is scrolling on TransitionEnd, this is an edge
                // case that should not call the onFauxScrollEnd function because the user
                // is still scrolling. Instead of calling onFauxScrollEnd set this
                // fauxScroll to moved so the scrollEnd and resetDestination functions
                // take care of calling the onFauxScrollEnd function after the user ends
                // the scroll.
                if (isScrolling()) {
                    clearInterval(state.fauxScrollEventInterval);
                    state.moved = true;
                } else if (state.scrollAnimating) {
                    onFauxScrollEnd('onFauxTransitionEnd');
                };
            };

            // Check if the TransitionEnd is out of bounds, if returns true reset
            // the position of the scrollEl to bounce back within bounds of the
            // wrapperEl.
            if (isDestinationOutOfBounds()) {
                resetDestination();
            };
        };


        /* ---------------------------------------------------------------- */


        function onNativeScroll(e) {
            var posX = -me.wrapperEl.scrollLeft(),
            posY = -me.wrapperEl.scrollTop(),
            leftDelta = state.scrollLeft - me.wrapperEl.scrollLeft(),
            topDelta = state.scrollTop - me.wrapperEl.scrollTop();

            state.direction = {
                x: leftDelta === 0 ? 0: (leftDelta > 0 ? -1: 1),
                y: topDelta === 0 ? 0: (topDelta > 0 ? -1: 1),
            };

            if (!state.scrollAnimating) setDestination(posX, posY);
            setScrollPosition(posX, posY);

            if (!state.scrollAnimating) {
                state.scrolling = true;
            };

            var scrollEvent = $.Event('fauxscroll');
            scrollEvent.scrollTop = getScrollTop();
            scrollEvent.scrollLeft = getScrollLeft();

            // console.log('onNativeScroll: getScrollTop:' + getScrollTop() + ' | destinationY:' + state.destination.y + ' | move:' + state.moved + ' | isScrollPositionWithinBounds:' + isScrollPositionWithinBounds());
            me.trigger(scrollEvent);

            clearTimeout(state.nativeScrollEndTimeOut);
            state.nativeScrollEndTimeOut = setTimeout(onNativeScrollEnd, 150);
        };


        function onNativeScrollEnd() {
            state.direction = {
                x: 0,
                y: 0
            };
            state.moved = false;
            state.scrollAnimating = false;
            state.scrolling = false;

            var scrollEndEvent = $.Event('fauxscroll:end');
            scrollEndEvent.scrollTop = getScrollTop();
            scrollEndEvent.scrollLeft = getScrollLeft();

            // console.log('onNativeScrollEnd: getScrollTop:' + getScrollTop() + ' | destinationY:' + state.destination.y + ' | move:' + state.moved + ' | isScrollPositionWithinBounds:' + isScrollPositionWithinBounds());
            me.trigger(scrollEndEvent);
        };


        /* ---------------------------------------------------------------- */


        function setDestination(x, y, hideScrollBars) {
            state.destination = {
                x: x,
                y: y
            };

            if ((support.hasTouch || settings.desktopCompatibility) && !settings.forceNativeScroll) {
                me.scrollEl.css('webkitTransform', support.translateOpen + x + 'px,' + y + 'px' + support.translateClose);

                // For some weird reason a new WebKitCSSMatrix has to be created to
                // "confirm" the destination. Without this the fauxScroll ends up in
                // an infinite loop after doing a jump and than scrolling towards a
                // location.
                new WebKitCSSMatrix(window.getComputedStyle(me.scrollEl[0]).webkitTransform);
            };

            return me;
        };


        function setScrollPosition(x, y) {
            state.scrollTop = -y;
            state.scrollLeft = -x;
        };


        function setTransitionTime(time) {
            var time = time || 0;

            if ((support.hasTouch || settings.desktopCompatibility) && !settings.forceNativeScroll) {
                me.scrollEl.css('webkitTransitionDuration', time + 'ms');
            };

            return me;
        };


        function resetDestination(noScroll) {
            var destinationX = state.destination.x,
            destinationY = state.destination.y,
            resetX = destinationX,
            resetY = destinationY,
            maxScrollX = state.dimensions.maxScrollX,
            maxScrollY = state.dimensions.maxScrollY,
            runtime = 0;

            // Check if the scrollEl scrolled past the left boundary or if the
            // scrollEl is smaller than the wrapperEl (maxScrollX > 0), if returns
            // true resetX equals 0 to reset the scrollEl to the left boundary.
            if (destinationX >= 0 || maxScrollX >= 0) {
                resetX = 0;
            }

            // Check if the scrollEl scrolled past the right boundary if returns
            // true resetX equals maxScrollX to reset the element to the right
            // boundary.
            else if (destinationX < maxScrollX) {
                resetX = maxScrollX;
            };

            // Check if the scrollEl scrolled past the top boundary or if the
            // scrollEl is smaller than the wrapperEl (maxScrollY > 0), if returns
            // true resetY equals 0 to reset the scrollEl to the top boundary.
            if (destinationY >= 0 || maxScrollY >= 0) {
                resetY = 0;
            }

            // Check if the scrollEl scrolled past the bottom boundary if returns
            // true resetY equals maxScrollY to reset the element to the bottom
            // boundary.
            else if (destinationY < maxScrollY) {
                resetY = maxScrollY;
            };

            // Define the runtime for the reset animated momentum scroll.
            if (isDestinationOutOfBounds()) {

                // TODO:
                // - Make this a variable runtime based on the distance.
                runtime = 350;
            };

            if (!noScroll && (resetX != destinationX || resetY != destinationY)) {
                fauxScrollTo(resetX, resetY, runtime, true);
            } else if (resetX !== destinationX || resetY !== destinationY) {
                setDestination(resetX, resetY);
                setScrollPosition(resetX, resetY);
            };

            return me;
        };


        /* ---------------------------------------------------------------- */


        function inputStart(e) {
            if (!state.enabled) {
                return;
            };

            state.distance = {
                x: 0,
                y: 0
            };
            state.moved = false;
            state.scrolling = true;

            if (state.scrollAnimating) {
                stopFauxAnimation();
                onFauxScroll();
            };

            setTransitionTime(0);

            state.inputStart = {
                x: support.hasTouch ? e.originalEvent.changedTouches[0].pageX: e.pageX,
                y: support.hasTouch ? e.originalEvent.changedTouches[0].pageY: e.pageY
            };

            state.scrollStart = {
                time: e.timeStamp,
                x: state.destination.x,
                y: state.destination.y
            };

            state.direction = {
                x: 0,
                y: 0
            };
        };


        function inputMove(e) {
            if (!state.scrolling) {
                return;
            };

            var destinationX = state.destination.x,
            destinationY = state.destination.y,
            distanceX = state.distance.x,
            distanceY = state.distance.y,
            maxScrollX = state.dimensions.maxScrollX,
            maxScrollY = state.dimensions.maxScrollY,
            scrollOnX = state.scrollAxes.x,
            scrollOnY = state.scrollAxes.y;

            var pageX = support.hasTouch ? e.originalEvent.changedTouches[0].pageX: e.pageX,
            pageY = support.hasTouch ? e.originalEvent.changedTouches[0].pageY: e.pageY,
            topDelta = scrollOnY ? pageY - state.inputStart.y: 0,
            leftDelta = scrollOnX ? pageX - state.inputStart.x: 0,
            newX = destinationX + leftDelta,
            newY = destinationY + topDelta;

            e.preventDefault();
            e.stopPropagation();

            state.inputStart = {
                x: pageX,
                y: pageY
            };

            // Gradually slow down if the scrollEl gets dragged outside
            // of the boundaries.
            if (newX >= 0 || newX < maxScrollX) {
                newX = settings.bounce ? Math.round(destinationX + leftDelta / 3) : (newX >= 0 || maxScrollX >= 0) ? 0: maxScrollX;
            };

            if (newY >= 0 || newY < maxScrollY) {
                newY = settings.bounce ? Math.round(destinationY + topDelta / 3) : (newY >= 0 || maxScrollY >= 0) ? 0: maxScrollY;
            };

            // Keep 5 pixels threshold before starting to drag and scroll the
            // scrollEl.
            if (distanceX + distanceY > 5) {

                state.direction = {
                    x: leftDelta === 0 ? 0: (leftDelta > 0 ? -1: 1),
                    y: topDelta === 0 ? 0: (topDelta > 0 ? -1: 1),
                };

                if (!state.scrollAxes.x) {
                    state.direction.x = 0;
                };

                if (!state.scrollAxes.y) {
                    state.direction.y = 0;
                };

                // Call the "onFauxScroll" function to handle this scroll move.
                onFauxScroll(newX, newY);
            } else {
                state.distance = {
                    x: distanceX + Math.abs(leftDelta),
                    y: distanceY + Math.abs(topDelta)
                };
            };
        };


        function inputEnd(e) {
            if (!state.scrolling) {
                return;
            };

            var time = e.timeStamp - state.scrollStart.time,
            newDuration = 0,
            newPositionX = state.destination.x,
            newPositionY = state.destination.y,
            momentumX,
            momentumY;

            var destinationX = state.destination.x,
            destinationY = state.destination.y,
            wrapperElHeight = state.dimensions.wrapperElHeight,
            wrapperElWidth = state.dimensions.wrapperElWidth,
            elHeight = state.dimensions.elHeight,
            elWidth = state.dimensions.elWidth,
            scrollStartX = state.scrollStart.x,
            scrollStartY = state.scrollStart.y,
            scrollOnX = state.scrollAxes.x,
            scrollOnY = state.scrollAxes.y;

            state.distance = {
                x: 0,
                y: 0
            };
            state.inputStart = {
                x: 0,
                y: 0
            };
            state.scrolling = false;
            state.scrollStart = {
                time: 0,
                x: 0,
                y: 0
            };

            // Check if the scrollEl has moved, if returns false
            // just trigger the default (touchend/mouseup) event without doing
            // anything after that.
            if (!state.moved) {
                return;
            };

            // Prevent a slingshot effect if the user swipes slowly or does not
            // drag at all by doing nothing and resetting the position of the
            // scrollEl.
            if (time > 250) {
                resetDestination();

                if (isScrollPositionWithinBounds()) {
                    onFauxScrollEnd('scrollEnd');
                };

                e.preventDefault();
                e.stopPropagation();
                return;
            };

            // Check if momentum is enabled, if returns true calcalute the distance
            // and time for the animated momentum scroll.
            if (settings.momentum) {
                momentumX = scrollOnX === true
                ? calculateMomentum(destinationX - scrollStartX,
                time,
                settings.bounce ? -destinationX + wrapperElWidth / 5: -destinationX,
                settings.bounce ? destinationX + elWidth - wrapperElWidth + wrapperElWidth / 5: destinationX + elWidth - wrapperElWidth)
                : {
                    dist: 0,
                    time: 0
                };

                momentumY = scrollOnY === true
                ? calculateMomentum(destinationY - scrollStartY,
                time,
                settings.bounce ? -destinationY + wrapperElHeight / 5: -destinationY,
                settings.bounce ? destinationY + elHeight - wrapperElHeight + wrapperElHeight / 5: destinationY + elHeight - wrapperElHeight)
                : {
                    dist: 0,
                    time: 0
                };

                newDuration = Math.max(Math.max(momentumX.time, momentumY.time), 1);
                newPositionX = destinationX + momentumX.dist;
                newPositionY = destinationY + momentumY.dist;
            };

            var scrollToNewDestination = destinationX != newPositionX || destinationY != newPositionY;

            if (scrollToNewDestination) {
                fauxScrollTo(newPositionX, newPositionY, newDuration, true);
            } else if (isScrollPositionOutOfBounds()) {
                resetDestination();
            } else if (isScrollPositionWithinBounds()) {
                onFauxScrollEnd('scrollEnd');
            };

            if (scrollToNewDestination || isScrollPositionOutOfBounds() || isScrollPositionWithinBounds()) {
                e.preventDefault();
                e.stopPropagation();
            };
        };


        /* ---------------------------------------------------------------- */


        function calculateMomentum(dist, time, maxDistUpper, maxDistLower) {
            var friction = 2.5,
            deceleration = 1.2,
            speed = Math.abs(dist) / time * 1000,
            newDist = speed * speed / friction / 1000,
            newTime = 0;

            if (dist > 0 && newDist > maxDistUpper) {
                speed = speed * maxDistUpper / newDist / friction;
                newDist = maxDistUpper;
            } else if (dist < 0 && newDist > maxDistLower) {
                speed = speed * maxDistLower / newDist / friction;
                newDist = maxDistLower;
            };

            newDist = newDist * (dist < 0 ? -1: 1);
            newTime = speed / deceleration;

            return {
                dist: Math.round(newDist),
                time: Math.round(newTime)
            };
        };


        /* ---------------------------------------------------------------- */


        function scrollTo(destX, destY, runtime) {
            if ((support.hasTouch || settings.desktopCompatibility) && !settings.forceNativeScroll) {
                fauxScrollTo(-destX, -destY, runtime);
            } else {
                nativeScrollTo(-destX, -destY, runtime);
            };
        };


        function stopAnimation() {
            if ((support.hasTouch || settings.desktopCompatibility) && !settings.forceNativeScroll) {
                stopFauxAnimation();
            } else {
                stopNativeAnimation();
            };
        };


        /* ---------------------------------------------------------------- */


        function fauxScrollTo(destX, destY, runtime, internalCall) {
            var runtime = runtime || 0;

            if ((state.destination.x === destX && -state.scrollLeft === destX) && (state.destination.y === destY && -state.scrollTop === destY)) {
                // console.log('scrollTo: stopFauxAnimation() because on same destination');
                stopFauxAnimation();
                return me;
            };

            if (state.scrollAnimating) {
                stopFauxAnimation();
            };

            setTransitionTime(runtime);

            state.moved = true;
            state.scrollAnimating = true;

            if (runtime == 0) {
                stopFauxAnimation();
                setDestination(destX, destY);
                setScrollPosition(destX, destY);
                resetDestination(true);
            } else {
                setDestination(destX, destY);
                state.fauxScrollEventInterval = setInterval(onFauxScroll, settings.scrollEventIntervalDelay);
            };

            return me;
        };


        function nativeScrollTo(destX, destY, runtime, internalCall) {
            var runtime = runtime || 0;

            // Correct destinations to max scroll values if needed.
            if (destX < state.dimensions.maxScrollX) {
                destX = state.dimensions.maxScrollX;
            } else if (destX > 0) {
                destX = 0;
            };
            if (destY < state.dimensions.maxScrollY) {
                destY = state.dimensions.maxScrollY;
            } else if (destY > 0) {
                destY = 0;
            };

            if ((state.destination.x === destX && -state.scrollLeft === destX) && (state.destination.y === destY && -state.scrollTop === destY)) {
                // console.log('scrollTo: stopNativeAnimation() because on same destination');
                stopNativeAnimation();
                return me;
            };

            if (state.scrollAnimating) {
                stopNativeAnimation();
            };

            setTransitionTime(runtime);

            state.moved = true;
            state.scrollAnimating = true;

            if (runtime === 0) {
                stopNativeAnimation();
                setDestination(destX, destY);
                me.wrapperEl.scrollLeft( - destX);
                me.wrapperEl.scrollTop( - destY);
            } else {
                setDestination(destX, destY);

                var currentScrollTop = me.wrapperEl.scrollTop();

                if (currentScrollTop < -destY) {
                    state.nativeScrollSpeed = ( - destY - currentScrollTop) / runtime;
                } else {
                    state.nativeScrollSpeed = (currentScrollTop - destY) / runtime;
                };

                state.nativeScrollAnimationInterval = setInterval(nativeScrollRepeater, 10);
            };

            return me;
        };


        function nativeScrollRepeater() {
            var d = -state.destination.y,
            i = state.dimensions.wrapperElHeight,
            h = -state.dimensions.maxScrollY,
            a = me.wrapperEl.scrollTop();

            // state.nativeScrollSpeed is beeing calculated in nativeScrollTo but
            // overridden here because speed doesn't work correctly yet.
            state.nativeScrollSpeed = 7.5;

            if (d > a) {
                if (h - d > i) {
                    a += Math.ceil((d - a) / state.nativeScrollSpeed);
                } else {
                    a += Math.ceil((d - a - (h - d)) / state.nativeScrollSpeed)
                };
            } else {
                a = a + (d - a) / state.nativeScrollSpeed;
            };

            me.wrapperEl.scrollTop(a);

            if (a == d) {
                state.nativeScrollSpeed = 0;
                stopNativeAnimation()
            };
        };


        /* ---------------------------------------------------------------- */


        function stopFauxAnimation(triggerScrollEnd) {
            clearInterval(state.fauxScrollEventInterval);

            var matrix = new WebKitCSSMatrix(window.getComputedStyle(me.scrollEl[0]).webkitTransform);

            setTransitionTime(0);

            state.direction = {
                x: 0,
                y: 0
            };
            state.moved = false;
            state.scrollAnimating = false;

            if (state.destination.x != matrix.e || state.destination.y != matrix.f || state.scrollTop != -matrix.f || state.scrollLeft != -matrix.e) {
                setDestination(matrix.e, matrix.f);
                setScrollPosition(matrix.e, matrix.f);
            };

            if (triggerScrollEnd) {
                onFauxScrollEnd('stopFauxAnimation');
            };

            return me;
        };


        function stopNativeAnimation() {
            clearInterval(state.nativeScrollAnimationInterval);

            setTransitionTime(0);

            state.destination = {
                x: -me.wrapperEl.scrollLeft(),
                y: -me.wrapperEl.scrollTop()
            };
            state.direction = {
                x: 0,
                y: 0
            };
            state.moved = false;
            state.scrolling = false;
            state.scrollAnimating = false;

            return me;
        };


    };


})(jQuery);