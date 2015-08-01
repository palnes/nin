(function() {
  'use strict';

  angular.module('nin')
    .controller('BottomCtrl', function ($scope, $interval, socket, camera, commands) {

      var linesContainer = null;

      $scope.xScale = 0.5;
      $scope.yScale = 1;

      $scope.onBottomScroll = function(event) {
        linesContainer = event.target;
        $scope.bottomScrollOffset = event.target.scrollLeft;
      };

      $scope.musicLayerClick = function($event) {
        var target = $('.layers-bar-container')[0];
        var rect = target.getBoundingClientRect();
        var offsetX = ($event.clientX - rect.left) | 0;
        $scope.demo.jumpToFrame(offsetX / $scope.xScale | 0);
      };

      $scope.$window = window;

      $scope.inspectLayer = function(layer) {
        $scope.$parent.$parent.inspectedLayer = $scope.inspectedLayer == layer ? null
                                                                               : layer;
        camera.startEdit(layer);
      };

      $scope.toggleMinimized = function(layer) {
        layer.minimized = !layer.minimized;
      };

      $scope.dragResizeLayer = function(event, ui, layer) {
        if (ui.position.left != (layer.startFrame * $scope.xScale | 0)) {
          socket.sendEvent('set', {
            id: layer.position,
            field: 'startFrame',
            value: (ui.position.left / $scope.xScale | 0)
          });
        } else {
          socket.sendEvent('set', {
            id: layer.position,
            field: 'endFrame',
            value: ((ui.position.left + ui.size.width) / $scope.xScale | 0)
          });
        }
      };

      $scope.loopStart = null;
      $scope.loopEnd = null;
      $scope.loopActive = false;
      commands.on('setCuePoint', function() {
        var currentBEAN = BEAN_FOR_FRAME($scope.currentFrame);
        var currentQuantizedFrame = FRAME_FOR_BEAN(currentBEAN - currentBEAN % PROJECT.music.subdivision);
        if ($scope.loopStart === null) {
          $scope.loopStart = currentQuantizedFrame;
        } else if ($scope.loopEnd === null) {
          if ($scope.loopStart > $scope.currentFrame) {
            $scope.loopEnd = currentQuantizedFrame;
            $scope.loopStart = currentQuantizedFrame;
          } else {
            $scope.loopEnd = currentQuantizedFrame;
          }
          $scope.loopActive = true;
        } else {
          $scope.loopStart = null;
          $scope.loopEnd = null;
          $scope.loopActive = false;
        }
      });

      commands.on('multiplyLoopLengthBy', function(amount) {
        if ($scope.loopEnd === undefined || $scope.loopStart === undefined) {
          return;
        }

        var clampedAmount = Math.max(0, amount),
            loopLength = $scope.loopEnd - $scope.loopStart,
            newLoopLength = Math.max(1, loopLength * clampedAmount);

        $scope.loopEnd = $scope.loopStart + newLoopLength;
      });

      $scope.$watch('currentFrame', function (nextFrame) {
        if ($scope.loopActive && nextFrame >= $scope.loopEnd) {
          $scope.demo.jumpToFrame($scope.loopStart);
        }
      });

      $interval(function(){
        $scope.hideMarker = false;
        if(!linesContainer) {
          return;
        }
        if(linesContainer.scrollLeft > $scope.currentFrame * $scope.xScale ||
          $scope.currentFrame * $scope.xScale >= linesContainer.scrollLeft + $(linesContainer).width()) {
          $scope.hideMarker = true;
        }
      }, 1000 / 60);
    });
})();
