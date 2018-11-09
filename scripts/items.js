/**
 * Override and extend the basic :class:`Item` implementation
 */
class Item5e extends Item {
  roll() {
    const data = {
      template: `public/systems/dnd5e/templates/chat/${this.data.type}-card.html`,
      actor: this.actor,
      item: this.data,
      data: this[this.data.type+"ChatData"]()
    };
    renderTemplate(data.template, data).then(html => {
      ChatMessage.create({
        user: game.user._id,
        alias: this.actor.name,
        content: html
      }, true);
    });
  }

  /* -------------------------------------------- */

  equipmentChatData() {
    const data = duplicate(this.data.data);
    const properties = [
      CONFIG.armorTypes[data.armorType.value],
      data.armor.value + " AC",
      data.equipped.value ? "Equipped" : null,
      data.stealth.value ? "Stealth Disadv." : null,
    ];
    data.properties = properties.filter(p => p !== null);
    return data;
  }

  /* -------------------------------------------- */

  weaponChatData() {
    return this.data.data;
  }

  /* -------------------------------------------- */

  consumableChatData() {
    const data = duplicate(this.data.data);
    data.consumableType.str = CONFIG.consumableTypes[data.consumableType.value];
    data.properties = [data.consumableType.str, data.charges.value + "/" + data.charges.max + " Charges"];
    return data;
  }

  /* -------------------------------------------- */

  toolChatData() {
    const data = duplicate(this.data.data);
    let abl = this.actor.data.data.abilities[data.ability.value].label;
    const properties = [abl, data.proficient.value ? "Proficient" : null];
    data.properties = properties.filter(p => p !== null);
    return data;
  }

  /* -------------------------------------------- */

  backpackChatData() {
    return duplicate(this.data.data);
  }

  /* -------------------------------------------- */

  /**
   * Roll a Weapon Attack
   */
  rollWeaponAttack() {
    if ( this.type !== "weapon" ) throw "Wrong item type!";

    // Get data
    let abl = this.actor.data.data.abilities[this.data.data.ability.value || "str"],
      prof = this.actor.data.data.attributes.prof.value,
      parts = ["1d20", "@mod", "@prof", "@bonus"],
      flavor = `${this.name} - Attack Roll`;

    // Render modal dialog
    let template = "public/systems/dnd5e/templates/chat/roll-dialog.html";
    renderTemplate(template, {formula: parts.join(" + ")}).then(dlg => {
      new Dialog({
        title: flavor,
        content: dlg,
        buttons: {
          advantage: {
            label: "Advantage",
            callback: () => {
              parts[0] = "2d20kh";
              flavor += " (Advantage)"
            }
          },
          normal: {
            label: "Normal",
          },
          disadvantage: {
            label: "Disadvantage",
            callback: () => {
              parts[0] = "2d20kl";
              flavor += " (Disadvantage)"
            }
          }
        },
        close: html => {
          let bonus = html.find('[name="bonus"]').val();
          new Roll(parts.join(" + "), {mod: abl.mod, prof: prof, bonus: bonus}).toMessage({
            alias: this.actor.name,
            flavor: flavor
          });
        }
      }).render(true);
    });
  }

  /* -------------------------------------------- */

  /**
   * Roll Weapon Damage
   */
  rollWeaponDamage(alternate=false) {
    if ( this.type !== "weapon" ) throw "Wrong item type!";

    // Get data
    let abl = this.actor.data.data.abilities[this.data.data.ability.value || "str"],
      dmg = alternate ? this.data.data.damage2.value : this.data.data.damage.value,
      parts = [dmg, "@mod", "@bonus"],
      flavor = `${this.name} - Damage Roll`;

    // Render modal dialog
    let template = "public/systems/dnd5e/templates/chat/roll-dialog.html";
    renderTemplate(template, {formula: parts.join(" + ")}).then(dlg => {
      new Dialog({
        title: flavor,
        content: dlg,
        buttons: {
          advantage: {
            label: "Critical Hit",
            callback: () => {
              parts[0] = Roll.alter(dmg, 0, 2);
              flavor += " (Critical)"
            }
          },
          normal: {
            label: "Normal",
          },
        },
        close: html => {
          let bonus = html.find('[name="bonus"]').val();
          new Roll(parts.join(" + "), {mod: abl.mod, bonus: bonus}).toMessage({
            alias: this.actor.name,
            flavor: flavor
          });
        }
      }).render(true);
    });
  }

  /* -------------------------------------------- */

  /**
   * Use a consumable item
   */
  useConsumable() {
    new Roll(this.data.data.consume.value).toMessage({
      alias: this.actor.name,
      flavor: `Uses ${this.name}`
    });
  }

  /* -------------------------------------------- */

  /**
   * Roll a Tool check
   */
  toolCheck() {
    if ( this.type !== "tool" ) throw "Wrong item type!";

    // Get data
    let ad = this.actor.data.data,
      abl = ad.abilities[this.data.data.ability.value],
      prof = ad.attributes.prof.value * (this.data.data.proficient.value || 0),
      parts = ["1d20", "@mod", "@prof", "@bonus"],
      flavor = `${this.name} - Tool Check`;

    // Render modal dialog
    let template = "public/systems/dnd5e/templates/chat/roll-dialog.html";
    renderTemplate(template, {formula: parts.join(" + ")}).then(dlg => {
      new Dialog({
        title: flavor,
        content: dlg,
        buttons: {
          advantage: {
            label: "Advantage",
            callback: () => {
              parts[0] = "2d20kh";
              flavor += " (Advantage)"
            }
          },
          normal: {
            label: "Normal",
          },
          disadvantage: {
            label: "Disadvantage",
            callback: () => {
              parts[0] = "2d20kl";
              flavor += " (Disadvantage)"
            }
          }
        },
        close: html => {
          let bonus = html.find('[name="bonus"]').val();
          new Roll(parts.join(" + "), {mod: abl.mod, prof: prof, bonus: bonus}).toMessage({
            alias: this.actor.name,
            flavor: flavor
          });
        }
      }).render(true);
    });
  }

  /* -------------------------------------------- */

  static chatListeners(html) {
    html.on('click', '.card-buttons button', ev => {

      // Extract card data
      let button = $(ev.currentTarget),
          action = button.attr("data-action"),
          card = button.parents('.chat-card'),
          actor = game.actors.get(card.attr('data-actor-id')),
          itemId = Number(card.attr("data-item-id"));

      // Get the item
      if ( !actor ) return;
      let itemData = actor.items.find(i => i.id === itemId);
      if ( !itemData ) return;
      let item = new Item5e(itemData, actor);

      // Weapon attack
      if ( action === "weaponAttack" ) item.rollWeaponAttack();
      else if ( action === "weaponDamage" ) item.rollWeaponDamage();
      else if ( action === "weaponDamage2" ) item.rollWeaponDamage(true);

      // Consumable usage
      else if ( action === "consume" ) item.useConsumable();

      // Tool usage
      else if ( action === "toolCheck" ) item.toolCheck();
    });
  }
}


/* -------------------------------------------- */


// Activate global listeners
Hooks.on('renderChatLog', html => Item5e.chatListeners(html));

// Assign Item5e class to CONFIG
CONFIG.Item.entityClass = Item5e;


/* -------------------------------------------- */


/**
 * Override and extend the basic :class:`ItemSheet` implementation
 */
class Item5eSheet extends ItemSheet {
  constructor(item, options) {
    super(item, options);
    this.mce = null;
  }

  /* -------------------------------------------- */

  /**
   * Prepare item sheet data
   * Start with the base item data and extending with additional properties for rendering.
   */
  getData() {
    const data = super.getData();
    data['abilities'] = game.system.template.actor.data.abilities;
    data['damageTypes'] = CONFIG.damageTypes;
    let types = (this.item.type === "equipment") ? "armorTypes" : this.item.type + "Types";
    data[types] = CONFIG[types];
    if ( this.item.type === "spell" ) {
      data["spellSchools"] = CONFIG.spellSchools;
      data["spellLevels"] = CONFIG.spellLevels;
    }
    return data;
  }

  /* -------------------------------------------- */
  
  /**
   * Use a type-specific template for each different item type
   */
  get template() {
    let type = this.item.type;
    return `public/systems/dnd5e/templates/items/item-${type}-sheet.html`;
  }

  /* -------------------------------------------- */

  /**
   * Activate listeners for interactive item sheet events
   */
  activateListeners(html) {
    super.activateListeners(html);

	  // Activate TinyMCE Editors
	  html.find(".editor a.editor-edit").click(ev => {
	    let button = $(ev.currentTarget),
	        editor = button.siblings(".editor-content");
	    createEditor({
        target: editor[0],
        height: editor.parent().height() - 40,
        save_enablewhendirty: true,
        save_onsavecallback: ed => this._onSaveMCE(ed, editor.attr("data-edit"))
      }).then(ed => {
        this.mce = ed[0];
        button.hide();
        this.mce.focus();
      });
    });

    // Activate tabs
    html.find('.tabs').each((_, el) => new Tabs(el));
  }

  /* -------------------------------------------- */

  /**
   * Customize sheet closing behavior to ensure we clean up the MCE editor
   */
  close() {
    super.close();
    if ( this.mce ) this.mce.destroy();
  }

  /* -------------------------------------------- */

  _onSaveMCE(ed, target) {
    let itemData = {[target]: ed.getContent()};

    // Update owned items
    if (this.item.isOwned) {
      itemData.id = this.item.data.id;
      this.item.actor.updateOwnedItem(itemData, true);
      this.render(false);
    }

    // Update unowned items
    else {
      this.item.update(itemData, true);
      this.render(false);
    }

    // Destroy the editor
    ed.remove();
    ed.destroy();
  }
}


/* -------------------------------------------- */


// Override CONFIG
CONFIG.Item.sheetClass = Item5eSheet;

// Standard D&D Damage Types
CONFIG.damageTypes = {
  "acid": "Acid",
  "bludgeoning": "Bludgeoning",
  "cold": "Cold",
  "fire": "Fire",
  "force": "Force",
  "lightning": "Lightning",
  "necrotic": "Necrotic",
  "piercing": "Piercing",
  "poison": "Poison",
  "psychic": "Psychic",
  "radiant": "Radiant",
  "slashing": "Slashing",
  "thunder": "Thunder"
};

// Weapon Types
CONFIG.weaponTypes = {
  "simpleM": "Simple Melee",
  "simpleR": "Simple Ranged",
  "martialM": "Martial Melee",
  "martialR": "Martial Ranged",
  "natural": "Natural",
  "improv": "Improvised",
  "ammo": "Ammunition"
};

// Weapon Properties
CONFIG.weaponProperties = {
  "thr": "Thrown",
  "amm": "Ammunition",
  "fir": "Firearm",
  "rel": "Reload",
  "two": "Two-Handed",
  "fin": "Finesse",
  "lgt": "Light",
  "ver": "Versatile",
  "hvy": "Heavy",
  "rch": "Reach"
};

// Equipment Types
CONFIG.armorTypes = {
  "clothing": "Clothing",
  "light": "Light Armor",
  "medium": "Medium Armor",
  "heavy": "Heavy Armor",
  "bonus": "Magical Bonus",
  "natural": "Natural Armor",
  "shield": "Shield"
};

// Consumable Types
CONFIG.consumableTypes = {
  "potion": "Potion",
  "scroll": "Scroll",
  "wand": "Wand",
  "rod": "Rod",
  "trinket": "Trinket"
};

// Spell Types
CONFIG.spellTypes = {
  "attack": "Spell Attack",
  "save": "Saving Throw",
  "heal": "Healing",
  "utility": "Utility"
};

// Spell Schools
CONFIG.spellSchools = {
  "abj": "Abjuration",
  "con": "Conjuration",
  "div": "Divination",
  "enc": "Enchantment",
  "evo": "Evocation",
  "ill": "Illusion",
  "nec": "Necromancy",
  "trs": "Transmutation",
};

// Spell Levels
CONFIG.spellLevels = {
  0: "Cantrip",
  1: "1st Level",
  2: "2nd Level",
  3: "3rd Level",
  4: "4th Level",
  5: "5th Level",
  6: "6th Level",
  7: "7th Level",
  8: "8th Level",
  9: "9th Level"
};
