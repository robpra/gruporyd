                localDB.setItem("wssServer", $("#Configure_Account_wssServer").val());
                localDB.setItem("WebSocketPort", $("#Configure_Account_WebSocketPort").val());
                localDB.setItem("ServerPath", $("#Configure_Account_ServerPath").val());
                localDB.setItem("profileName", $("#Configure_Account_profileName").val());
                localDB.setItem("SipDomain", $("#Configure_Account_SipDomain").val());
                localDB.setItem("SipUsername", $("#Configure_Account_SipUsername").val());
                localDB.setItem("SipPassword", $("#Configure_Account_SipPassword").val());
                localDB.setItem("VoiceMailSubscribe", ($("#Configure_Account_Voicemail_Subscribe").is(':checked'))? "1" : "0");
                localDB.setItem("VoicemailDid", $("#Configure_Account_Voicemail_Did").val());

                localDB.setItem("ChatEngine", chatEng);

                localDB.setItem("XmppServer", $("#Configure_Account_xmpp_address").val());
                localDB.setItem("XmppWebsocketPort", $("#Configure_Account_xmpp_port").val());
                localDB.setItem("XmppWebsocketPath", $("#Configure_Account_xmpp_path").val());
                localDB.setItem("XmppDomain", $("#Configure_Account_xmpp_domain").val());
                localDB.setItem("profileUser", $("#Configure_Account_profileUser").val());