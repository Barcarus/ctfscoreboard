/**
 * Copyright 2014 David Tomaschik <david@systemoverlord.com>
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* Global services */
var globalServices = angular.module('globalServices', ['ngResource']);

globalServices.service('configService', ['$resource',
    function($resource) {
      return $resource('/api/config', {}, {
        'get': {cache: true}
      });
    }]);


globalServices.service('errorService',
    function() {
      this.errors = [];
      this.clearErrors = function() {
        this.errors.length = 0;
      };
      this.error = function(msg, severity) {
        severity = severity || 'danger';
        msg = (msg.data && msg.data.message) || msg.message || msg.data || msg;
        this.errors.push({severity: severity, msg: msg});
      };
      this.success = function(msg) {
        this.error(msg, 'success');
      }
    });


globalServices.service('newsService', [
    '$resource',
    '$interval',
    'configService',
    function($resource, $interval, configService) {
        this.newsResource = $resource('/api/news');
        this.get = this.newsResource.get;
        this.query = this.newsResource.query;
        this.pollPromise_ = undefined;
        this.inFlight_ = false;

        // Callbacks to be called on new news
        this.clients_ = [];
        this.registerClient = function(client) {
            this.clients_.push(client);
        };

        // Polling handler
        this.poll = function() {
            if (this.inFlight_)
                return;
            this.inFlight_ = true;
            this.newsResource.query(angular.bind(this, function(data) {
                angular.forEach(this.clients_, function(cb) {
                    cb(data);
                });
                this.inFlight_ = false;
            }), angular.bind(this, function() { this.inFlight_ = false }));
        };

        // Set up polling
        this.start = function() {
            if (this.pollPromise_)
                return;
            this.poll();
            configService.get(angular.bind(this, function(config) {
                if (config.news_mechanism != 'poll')
                    return;
                var interval = config.news_poll_interval || 60000;  // 60 seconds
                this.pollPromise_ = $interval(angular.bind(this, this.poll), interval);
            }));
        };

        // Shutdown
        this.stop = function() {
            $interval.cancel(this.pollPromise_);
            this.pollPromise_ = undefined;
        };
    }]);
