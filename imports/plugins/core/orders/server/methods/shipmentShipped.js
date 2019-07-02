import Logger from "@reactioncommerce/logger";
import { Meteor } from "meteor/meteor";
import { check } from "meteor/check";
import Reaction from "/imports/plugins/core/core/server/Reaction";
import rawCollections from "/imports/collections/rawCollections";
import getGraphQLContextInMeteorMethod from "/imports/plugins/core/graphql/server/getGraphQLContextInMeteorMethod";
import createNotification from "/imports/plugins/included/notifications/server/no-meteor/createNotification";
import sendOrderEmail from "../no-meteor/util/sendOrderEmail";
import updateShipmentStatus from "../util/updateShipmentStatus";

/**
 * @name orders/shipmentShipped
 * @method
 * @memberof Orders/Methods
 * @summary trigger shipmentShipped status and workflow update
 * @param {Object} order - order object
 * @param {Object} fulfillmentGroup - fulfillmentGroup object
 * @return {Object} return results of several operations
 */
export default function shipmentShipped(order, fulfillmentGroup) {
  check(order, Object);
  check(fulfillmentGroup, Object);

  updateShipmentStatus({
    fulfillmentGroupId: fulfillmentGroup._id,
    order,
    status: "shipped"
  });

  // Notify by email
  const context = Promise.await(getGraphQLContextInMeteorMethod(Reaction.getUserId()));
  sendOrderEmail(context, order, "shipped");

  // Notify by in-app notification
  const { accountId } = order;
  if (accountId) {
    const prefix = Reaction.getShopPrefix();
    const url = `${prefix}/notifications`;
    createNotification(rawCollections, { accountId, type: "orderShipped", url }).catch((error) => {
      Logger.error("Error in createNotification within shipmentShipped", error);
    });
  }

  // Then try to mark order as completed.
  return Meteor.call("workflow/pushOrderWorkflow", "coreOrderWorkflow", "completed", order);
}
