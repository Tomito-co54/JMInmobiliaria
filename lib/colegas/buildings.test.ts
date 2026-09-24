import { describe, expect, it } from "vitest";
import { groupPartnerUnits, type PartnerUnit } from "./buildings";

const unit = (externalId: string, address: string, nomenclatura?: string, inside = true): PartnerUnit => ({
  externalId,
  address,
  parcel: nomenclatura ? { nomenclatura, inside } : null,
});

describe("groupPartnerUnits", () => {
  it("joins two spellings of one address when the cadastre puts both inside the same parcel", () => {
    const out = groupPartnerUnits([
      unit("1", "Diagonal Brown 1574", "P18B"),
      unit("2", "Diagonal Almirante Brown 1574", "P18B"),
      unit("3", "Diagonal Almirante Brown 1574", "P18B"),
      unit("4", "Diagonal Brown 1574", "P18B"),
    ]);
    for (const id of ["1", "2", "3", "4"]) {
      expect(out.get(id)).toEqual({ nomenclatura: "P18B", address: "Diagonal Almirante Brown 1574", size: 4 });
    }
  });

  it("joins one address whose pins fell on two parcels, with one parcel for both", () => {
    const out = groupPartnerUnits([
      unit("710404", "Jorge San Pellerano 700", "P6"),
      unit("710405", "jorge san  pellerano 700", "P5"),
    ]);
    expect(out.get("710404")?.nomenclatura).toBe(out.get("710405")?.nomenclatura);
    expect(out.get("710404")?.nomenclatura).toBe("P6");
    expect(out.get("710405")?.size).toBe(2);
  });

  it("trusts a pin inside a parcel over one merely near another", () => {
    const out = groupPartnerUnits([
      unit("1", "Somellera 538", "OTHER-BLOCK", false),
      unit("2", "Somellera 538", "RIGHT"),
    ]);
    expect(out.get("1")?.nomenclatura).toBe("RIGHT");
  });

  it("does not join two listings only because their pins are near the same parcel", () => {
    const out = groupPartnerUnits([unit("1", "Mitre 100", "P1", false), unit("2", "Pellegrini 5", "P1", false)]);
    expect(out.get("1")).toEqual({ nomenclatura: null, address: "Mitre 100", size: 1 });
    expect(out.get("2")?.size).toBe(1);
  });

  it("gives a listing on its own no parcel", () => {
    const out = groupPartnerUnits([unit("1", "Canale 1", "P1")]);
    expect(out.get("1")).toEqual({ nomenclatura: null, address: "Canale 1", size: 1 });
  });

  it("places an address-formed building on the nearby parcel when no pin fell inside one", () => {
    const out = groupPartnerUnits([unit("1", "Murature 2195", "P1", false), unit("2", "Murature 2195", "P1", false)]);
    expect(out.get("1")).toEqual({ nomenclatura: "P1", address: "Murature 2195", size: 2 });
  });

  it("leaves a building without a parcel when the cadastre found none", () => {
    const out = groupPartnerUnits([unit("1", "Murature 2195"), unit("2", "Murature 2195")]);
    expect(out.get("1")).toEqual({ nomenclatura: null, address: "Murature 2195", size: 2 });
  });
});
