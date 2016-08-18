/*
 * (C) Copyright 2015, Siemens AG
 * Author: Marcos J. S. Rocha
 *
 * SPDX-License-Identifier:     BSD-2-Clause
 */
'use strict';

var users = [];

var currentUsers;

/**
 * Returns clone of the default list of devices with their associated sensors
 * @returns default list of devices
 */
function getDefaultUsers() {
  // clone users list
  var chUsers = JSON.parse(JSON.stringify(users));
  // attach clone of users list of users
  return chUsers;
}

/**
 * Gets the current list of users
 * @returns list of users
 */
function getUsers() {
  if (!currentUsers) {
    currentUsers = getDefaultUsers();
  }
  return currentUsers;
}

/**
 * Sets the current list of users to its default value
 * @returns updated list of users
 */
function setUsersToDefault() {
  currentUsers = getDefaultUsers();
  return currentUsers;
}


module.exports = {
  /**
   * Returns clone of the default list of users
   * @returns default list of users
   */
  getDefaultUsers: getDefaultUsers,

  /**
   * Gets the current list of users
   * @returns list of users
   */
  getUsers: getUsers,

  /**
   * Sets the current list of users to its default value
   * @returns updated list of users
   */
  setUsersToDefault: setUsersToDefault
};


