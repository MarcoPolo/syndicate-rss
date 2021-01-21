{
  description = "syndicate-rss";
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/release-20.09";
  inputs.flake-utils.url = "github:numtide/flake-utils";

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem
      (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
        in
        {
          devShell = pkgs.mkShell {
            buildInputs = [ pkgs.nodejs-14_x pkgs.yarn pkgs.yarn2nix ];
          };
        }
      );
}
