import Vue from "vue";
import App from "./App.vue";
import { Service } from "mfei";

// use default acl control that applies to all handlers
// note: empty array means denying all request
// you can also instantiate Service with no params to allow all request from all origin
// "http://localhost:8080" is "base" application domain origin when you start "base" application
const acl = ["http://localhost:8080"];
const service = new Service(acl);

// register default request handlers
// it should be registered only once, otherwise it would be replaced
service.registerRequestHandlers({
  hello(msg, event) {
    return {
      data: {
        msg: `hello, i'm from ${location.origin}, you are from ${event.origin}`,
      },
    };
  },
});

// register request handlers use another form to specify acl policy
service.registerRequestHandlers({
  key: "auth", // must specify key otherwise it may be replaced
  acl: ["http://localhost:8082"], // the handlers are controlled by this policy, default: undefined (allow all)
  excludeDefaultAcl: true, // whether default acl policy controls these handlers, default: false if not specified
  handlers: {
    // the keys ("getToken", "getSecretInfo", ...) are request message type
    getToken({ data }) {
      // the parameter details will show in type definitions
      // because default response message type is "data", in general,
      // you need to return a message object which specify a "data" property,
      // and the data property value is which the request sender will get,
      // otherwise request sender may get undefined
      return {
        data: {
          token: "you are allowed to get token",
        },
      };
    },
    getSecretInfo({ data }) {
      return {
        data: {
          secret: `got '${data.token}', you are welcome`,
        },
      };
    },
  },
});

// you can also define any response message type you want by return a message
// object which specify a "type" property, in this case, other properties are
// defined based on your requirements
// note: customized response message type must have a corresponding response
// handler in service loader (the main application which loads the service)
// otherwise request message sender will get a "MessagerUnknownResponseTypeError" error
service.registerRequestHandlers({
  key: "custom",
  handlers: {
    customizedTypeRequestHandler({ type }) {
      return {
        type: "customize",
        data: {
          secret: `got '${type}', you are welcome`,
        },
      };
    },
  },
});

Vue.config.productionTip = false;

new Vue({
  render: h => h(App)
}).$mount("#app");
