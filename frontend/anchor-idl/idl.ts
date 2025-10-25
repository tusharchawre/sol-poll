/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/contract.json`.
 */
export type Contract = {
  "address": "3djVsscqrPVpY2q4aGzcgYZjFaLnSRwiingCBkC2WFcE",
  "metadata": {
    "name": "contract",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "cancelCampaign",
      "discriminator": [
        66,
        10,
        32,
        138,
        122,
        36,
        134,
        202
      ],
      "accounts": [
        {
          "name": "creator",
          "writable": true,
          "signer": true,
          "relations": [
            "campaign"
          ]
        },
        {
          "name": "campaign",
          "writable": true
        },
        {
          "name": "platformConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "closeCampaign",
      "discriminator": [
        65,
        49,
        110,
        7,
        63,
        238,
        206,
        77
      ],
      "accounts": [
        {
          "name": "campaign",
          "writable": true
        },
        {
          "name": "platformConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "createCampaign",
      "discriminator": [
        111,
        131,
        187,
        98,
        160,
        193,
        114,
        244
      ],
      "accounts": [
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "campaign",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  97,
                  109,
                  112,
                  97,
                  105,
                  103,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "creator"
              },
              {
                "kind": "arg",
                "path": "campaignId"
              }
            ]
          }
        },
        {
          "name": "platformConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "campaignId",
          "type": "u64"
        },
        {
          "name": "title",
          "type": "string"
        },
        {
          "name": "description",
          "type": "string"
        },
        {
          "name": "options",
          "type": {
            "vec": "string"
          }
        },
        {
          "name": "reward",
          "type": "u64"
        },
        {
          "name": "maxParticipants",
          "type": "u64"
        },
        {
          "name": "minReputation",
          "type": "u64"
        },
        {
          "name": "endDate",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initializePlatform",
      "discriminator": [
        119,
        201,
        101,
        45,
        75,
        122,
        89,
        3
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "platformConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "feePercentage",
          "type": "u16"
        }
      ]
    },
    {
      "name": "submitVote",
      "discriminator": [
        115,
        242,
        100,
        0,
        49,
        178,
        242,
        133
      ],
      "accounts": [
        {
          "name": "voter",
          "writable": true,
          "signer": true
        },
        {
          "name": "campaign",
          "writable": true
        },
        {
          "name": "vote",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "campaign"
              },
              {
                "kind": "account",
                "path": "voter"
              }
            ]
          }
        },
        {
          "name": "userReputation",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  112,
                  117,
                  116,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "voter"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "choice",
          "type": "u8"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "campaign",
      "discriminator": [
        50,
        40,
        49,
        11,
        157,
        220,
        229,
        192
      ]
    },
    {
      "name": "platformConfig",
      "discriminator": [
        160,
        78,
        128,
        0,
        248,
        83,
        230,
        160
      ]
    },
    {
      "name": "userReputation",
      "discriminator": [
        86,
        95,
        94,
        218,
        215,
        219,
        207,
        37
      ]
    },
    {
      "name": "vote",
      "discriminator": [
        96,
        91,
        104,
        57,
        145,
        35,
        172,
        155
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "feeTooHigh",
      "msg": "Fee percentage cannot exceed 10%"
    },
    {
      "code": 6001,
      "name": "titleTooLong",
      "msg": "Title too long (max 100 characters)"
    },
    {
      "code": 6002,
      "name": "descriptionTooLong",
      "msg": "Description too long (max 500 characters)"
    },
    {
      "code": 6003,
      "name": "notEnoughImages",
      "msg": "Need at least 2 images"
    },
    {
      "code": 6004,
      "name": "tooManyImages",
      "msg": "Maximum 10 images allowed"
    },
    {
      "code": 6005,
      "name": "imageHashTooLong",
      "msg": "Image hash too long"
    },
    {
      "code": 6006,
      "name": "invalidPrize",
      "msg": "Invalid prize amount"
    },
    {
      "code": 6007,
      "name": "invalidParticipants",
      "msg": "Invalid number of participants"
    },
    {
      "code": 6008,
      "name": "rewardTooSmall",
      "msg": "Reward per participant too small"
    },
    {
      "code": 6009,
      "name": "campaignNotActive",
      "msg": "Campaign is not active"
    },
    {
      "code": 6010,
      "name": "campaignExpired",
      "msg": "Campaign has expired"
    },
    {
      "code": 6011,
      "name": "invalidChoice",
      "msg": "Invalid choice"
    },
    {
      "code": 6012,
      "name": "insufficientReputation",
      "msg": "Insufficient reputation"
    },
    {
      "code": 6013,
      "name": "campaignFull",
      "msg": "Campaign is full"
    },
    {
      "code": 6014,
      "name": "campaignStillActive",
      "msg": "Campaign still active"
    },
    {
      "code": 6015,
      "name": "unauthorized",
      "msg": "unauthorized"
    },
    {
      "code": 6016,
      "name": "insufficientFunds",
      "msg": "Insufficient funds"
    },
    {
      "code": 6017,
      "name": "creatorCannotVote",
      "msg": "Creator Cannot Vote"
    },
    {
      "code": 6018,
      "name": "campaignHasVotes",
      "msg": "Campaign already has votes, cannot cancel"
    }
  ],
  "types": [
    {
      "name": "campaign",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "title",
            "type": "string"
          },
          {
            "name": "description",
            "type": "string"
          },
          {
            "name": "options",
            "type": {
              "vec": "string"
            }
          },
          {
            "name": "reward",
            "type": "u64"
          },
          {
            "name": "participants",
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "maxParticipants",
            "type": "u64"
          },
          {
            "name": "rewardPerParticipant",
            "type": "u64"
          },
          {
            "name": "voteCount",
            "type": {
              "vec": "u64"
            }
          },
          {
            "name": "totalVotes",
            "type": "u64"
          },
          {
            "name": "minReputation",
            "type": "u64"
          },
          {
            "name": "endDate",
            "type": "u64"
          },
          {
            "name": "isActive",
            "type": "bool"
          },
          {
            "name": "createdAt",
            "type": "u64"
          },
          {
            "name": "updatedAt",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "platformConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "feePercentage",
            "type": "u16"
          },
          {
            "name": "totalFeeCollected",
            "type": "u64"
          },
          {
            "name": "totalCampaigns",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "reputationTier",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "newbie"
          },
          {
            "name": "regular"
          },
          {
            "name": "veteran"
          },
          {
            "name": "legend"
          }
        ]
      }
    },
    {
      "name": "userReputation",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "totalVotes",
            "type": "u32"
          },
          {
            "name": "currentStreak",
            "type": "u32"
          },
          {
            "name": "longestStreak",
            "type": "u32"
          },
          {
            "name": "lastVoteTimestamp",
            "type": "i64"
          },
          {
            "name": "reputationScore",
            "type": "u32"
          },
          {
            "name": "tier",
            "type": {
              "defined": {
                "name": "reputationTier"
              }
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "vote",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "campaign",
            "type": "pubkey"
          },
          {
            "name": "voter",
            "type": "pubkey"
          },
          {
            "name": "choice",
            "type": "u8"
          },
          {
            "name": "votedAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ]
};
