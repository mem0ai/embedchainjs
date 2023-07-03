function clean_string(text) {
  /*
  This function takes in a string and performs a series of text cleaning operations. 

  Args:
    text (str): The text to be cleaned. This is expected to be a string.

  Returns:
    cleaned_text (str): The cleaned text after all the cleaning operations have been performed.
  */
  // Replacement of newline characters:
  text = text.replace(/\n/g, " ");

  // Stripping and reducing multiple spaces to single:
  let cleaned_text = text.trim().replace(/\s+/g, " ");

  // Removing backslashes:
  cleaned_text = cleaned_text.replace(/\\/g, "");

  // Replacing hash characters:
  cleaned_text = cleaned_text.replace(/#/g, " ");

  // Eliminating consecutive non-alphanumeric characters:
  // This regex identifies consecutive non-alphanumeric characters (i.e., not a word character [a-zA-Z0-9_] and not a whitespace) in the string
  // and replaces each group of such characters with a single occurrence of that character.
  // For example, "!!! hello !!!" would become "! hello !".
  cleaned_text = cleaned_text.replace(/([^\w\s])\1*/g, "$1");

  return cleaned_text;
}

module.exports = { clean_string };
