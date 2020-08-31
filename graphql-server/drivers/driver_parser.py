import argparse
import yaml


def parse(input_file, output_dir, config: dict):
    # Simple function to parse a file to remove specific parts depending on the choosen config

    input_f = open(input_file, 'r')

    output_f = open(output_dir+'\\driver.js',"w")

    if_stack = [True]

    for line in input_f.readlines():
        if line.strip().startswith('// #'):
            if line.strip().startswith('// #ENDIF'):
                if_stack.pop()
            if line.strip().startswith('// #IF'):
                sub_line = line.strip()[7:]
                if_stack.append(config.get('generation').get(sub_line))
        elif if_stack[-1]:
            output_f.write(line)

    output_f.close()
    input_f.close()

def cmd(args):
    # load config
    config = {}
    if args.config:
        with open(args.config) as f:
            config = yaml.safe_load(f)

    parse(args.input, args.output, config)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', type=str, required=True,
                        help='Driver file')
    parser.add_argument('--output', type=str,
                        help='Output directory for new driver file')
    parser.add_argument('--config', type=str,
                        help='Path to configuration file')
    cmd(parser.parse_args())
