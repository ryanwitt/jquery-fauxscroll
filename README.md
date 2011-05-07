jQuery Faux Scroll
===================================
Mobile Webkit browsers on touch enabled devices do not support fixed layout. With the jQuery Fix Body Plugin you can create fixed layouts, but you'll lose the native scroll features. This plugin turns every container into scrollable element and re-enables scrolling. Think of it as a container element with overflow: scroll applied to it.

This plugins is build with multi platform support. It behaves exactly the same on mobile and desktop Webkit browser.


Dependencies
===================================
jQuery 1.5.2+ (https://github.com/jquery/jquery)
jQuery Fix Body Plugin (https://github.com/jvduf/jquery-fixbody)


How to use
===================================
    <script>
      $(document).ready(function(){

        // Fixes the body and on Android removes the URL field.
        $.fixBody({
          platform: $.platform(),
        });


        // ...
        function readyFn() {
          $('#overflow-container').fauxScroll();
        };

        // ...
        function refreshFn() {
          $('#overflow-container').fauxScroll('refresh');
        };


        // On body "ready" execute the code you would normally
        // fire on document ready.
        $('body').bind('ready', function(e){
          readyFn();
        });

        // On body "fixed" execute the code that should fire on
        // orientation change of mobile devices or on window
        // resize of desktop devices.
        $('body').bind('fixed', function(e){
          refreshFn();
        });

      });
    </script>