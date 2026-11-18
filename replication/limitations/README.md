# Evidence and reproducibility boundaries
## Not released (confidentiality)

| Item                                                                                                                                                               | Reason                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| The two industrial applications of the industrial partner, their source code, data and identifiers, and any per-application records of the industrial applications | proprietary; covered by the partner's confidentiality constraints |
| Industrial Application 2's real name                                                                                                                               | withheld; the dissertation's pseudonym is used                    |

The Airbus Inventory Management System (open source) and the Posts & Users demo applications are public. The demo applications are referenced as submodules under `demo/`.

## What the package supports

| Supported                                                                                                    | Not supported                                                                    |
| ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Recomputing the reported EQ2 overheads and EQ1 time statistics from retained data                            | Re-running EQ1 or EQ2                                                            |
| Building, testing and inspecting the current implementation, and generating agents for the demo applications | Benchmarking the current implementation as part of the dissertation's evaluation |
| Checking the dissertation's arithmetic and rounding                                                          | Independently verifying EQ1 precision and recall                                 |
